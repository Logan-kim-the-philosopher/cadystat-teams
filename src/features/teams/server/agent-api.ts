import { createHash } from 'node:crypto';
import type { APIRoute, APIContext } from 'astro';
import { getSupabaseServerClient } from '../../../lib/server/supabase';
import { meetingApiKeyHashFromHeader } from '../../../lib/server/meeting-api-keys.mjs';
import { readLimitedJson, RequestBodyError } from '../../../lib/server/limited-json';
import { meetingId, MeetingInputError } from '../domain/meetings';
import { parseTicketNumber, TicketInputError } from '../domain/tickets';
import { agentPagination, agentTicketInput } from '../domain/agent-api';
import type { Json } from './database.types';

export function agentError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status, headers: {
    ...(status === 401 ? { 'WWW-Authenticate': 'Bearer realm="teams-api"' } : {}),
    ...(status === 429 ? { 'Retry-After': '60' } : {})
  } });
}
export function agentMethods(allow: string) {
  return {
    OPTIONS: (() => new Response(null, { status: 204, headers: { Allow: allow } })) as APIRoute,
    ALL: (() => Response.json({ error: { code: 'method_not_allowed', message: `${allow}만 지원합니다.` } }, { status: 405, headers: { Allow: allow } })) as APIRoute
  };
}
function rpcObject(value: Json) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_rpc_response');
  return value;
}
function rpcFailure(result: Record<string, Json | undefined>): Response | null {
  const errors: Record<string, [number, string]> = {
    invalid_api_key: [401, '유효한 API 키가 필요합니다.'], forbidden: [403, '회의록·티켓 관리자 키가 필요합니다.'],
    rate_limited: [429, '키당 분당 60회까지 요청할 수 있습니다.'], invalid_request: [400, '입력 필드와 요청 ID를 확인하세요.'],
    invalid_ticket: [400, '티켓 유형·담당 팀·담당자·상태 전환 규칙을 확인하세요.'],
    meeting_not_found: [404, '이 키로 접근할 수 있는 회의록을 찾을 수 없습니다.'], ticket_not_found: [404, '티켓을 찾을 수 없습니다.'],
    idempotency_conflict: [409, '동일 요청 ID에 다른 대상·작업·내용이 전달되었습니다.'], ticket_deleted: [409, '이 요청의 티켓은 삭제되었습니다.']
  };
  if (!result.error) return null;
  if (typeof result.error !== 'string' || !errors[result.error]) throw new Error('unknown_rpc_error');
  const [status, message] = errors[result.error]; return agentError(result.error, message, status);
}
async function authenticated(request: Request, admin = false) {
  const hash = meetingApiKeyHashFromHeader(request.headers.get('authorization'));
  if (!hash) return agentError('invalid_api_key', '유효한 API 키가 필요합니다.', 401);
  const client = getSupabaseServerClient();
  const result = await client.from('meeting_api_keys').select('id,role').eq('key_hash', hash)
    .is('revoked_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
  if (result.error) throw new Error('key_lookup_failed');
  if (!result.data) return agentError('invalid_api_key', '유효한 API 키가 필요합니다.', 401);
  if (admin && result.data.role !== 'teams_admin') return agentError('forbidden', '회의록·티켓 관리자 키가 필요합니다.', 403);
  // Every data operation rechecks under the database key lock, including role changes.
  return { client, hash };
}
function caught(error: unknown) {
  if (error instanceof MeetingInputError || error instanceof TicketInputError) return agentError('invalid_request', error.message, 400);
  if (error instanceof RequestBodyError) return agentError('invalid_request', error.message, error.status);
  console.error('[agent-api] 요청 처리 실패');
  return agentError('service_unavailable', '처리하지 못했습니다. 변경 요청은 같은 요청 ID로 다시 시도하세요.', 503);
}
export function agentRead(resource: 'me' | 'meetings' | 'tickets' | 'ticket-options', detail = false): APIRoute {
  return async ({ request, params, url }) => {
    try {
      const auth = await authenticated(request, resource === 'tickets' || resource === 'ticket-options');
      if (auth instanceof Response) return auth;
      const page = agentPagination(url, !detail && ['meetings', 'tickets'].includes(resource));
      const id = detail ? resource === 'meetings' ? meetingId(params.id) : parseTicketNumber(params.ticketNumber) : null;
      const { data, error } = await auth.client.rpc('read_agent_api', {
        p_key_hash: auth.hash, p_resource: resource, p_id: id ?? undefined, p_limit: page.limit, p_offset: page.offset, p_query: page.query
      });
      if (error) throw new Error('read_failed');
      const result = rpcObject(data);
      return rpcFailure(result) ?? Response.json(result);
    } catch (error) { return caught(error); }
  };
}
export async function emptyAgentBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return;
  try { while (true) {
    const { done, value } = await reader.read();
    if (done) return;
    if (value.byteLength) { await reader.cancel(); throw new MeetingInputError('DELETE 요청에는 본문을 보내지 마세요.'); }
  } } finally { reader.releaseLock(); }
}
export const agentTicketMutation: APIRoute = async ({ request, params, url }: APIContext) => {
  try {
    const auth = await authenticated(request, true);
    if (auth instanceof Response) return auth;
    agentPagination(url, false);
    const method = request.method as 'POST' | 'PATCH' | 'DELETE';
    const number = method === 'POST' ? undefined : parseTicketNumber(params.ticketNumber);
    const requestId = request.headers.get('idempotency-key');
    if (!requestId || !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)) throw new MeetingInputError('Idempotency-Key가 필요합니다(1~128자).');
    let patch = {};
    if (method === 'DELETE') await emptyAgentBody(request);
    else patch = agentTicketInput(await readLimitedJson(request, 64 * 1024), method);
    const { data, error } = await auth.client.rpc('mutate_agent_ticket', {
      p_key_hash: auth.hash, p_request_id: requestId, p_operation: method, p_ticket_number: number,
      p_payload_hash: createHash('sha256').update(JSON.stringify(patch)).digest('hex'), p_patch: patch
    });
    if (error) throw new Error('ticket_mutation_failed');
    const result = rpcObject(data); const failure = rpcFailure(result);
    if (failure) return failure;
    const ticket = rpcObject(result.ticket as Json);
    if (typeof ticket.id !== 'string' || typeof ticket.number !== 'string' || typeof ticket.path !== 'string' || typeof result.replayed !== 'boolean') throw new Error('invalid_ticket_response');
    if (method === 'DELETE') return new Response(null, { status: 204 });
    return Response.json(result, { status: method === 'POST' && !result.replayed ? 201 : 200, headers: { Location: ticket.path } });
  } catch (error) { return caught(error); }
};
