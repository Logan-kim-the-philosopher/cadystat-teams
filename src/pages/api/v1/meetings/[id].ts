import { agentRead, agentMethods } from '../../../../features/teams/server/agent-api';
import { createHash } from 'node:crypto';
import type { APIRoute } from 'astro';
import { meetingId, meetingPatch, MeetingInputError } from '../../../../features/teams/domain/meetings';
import { getSupabaseServerClient } from '../../../../lib/server/supabase';
import { meetingApiKeyHashFromHeader } from '../../../../lib/server/meeting-api-keys.mjs';
import { readLimitedJson, RequestBodyError } from '../../../../lib/server/limited-json';

export const prerender = false;
function failure(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status, headers: {
    ...(status === 401 ? { 'WWW-Authenticate': 'Bearer realm="meeting-api"' } : {}),
    ...(status === 429 ? { 'Retry-After': '60' } : {})
  } });
}
const invalidKey = () => failure('invalid_api_key', '유효한 회의록 API 키가 필요합니다.', 401);
const mutate: APIRoute = async ({ request, params, url }) => {
  const keyHash = meetingApiKeyHashFromHeader(request.headers.get('authorization'));
  if (!keyHash) return invalidKey();
  try {
    const client = getSupabaseServerClient();
    const key = await client.from('meeting_api_keys').select('id').eq('key_hash', keyHash)
      .is('revoked_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (key.error) throw new Error('key_lookup_failed');
    if (!key.data) return invalidKey();
    const id = meetingId(params.id);
    if (url.search) return failure('invalid_request', 'Query parameter는 지원하지 않습니다.', 400);
    const requestId = request.headers.get('idempotency-key');
    if (!requestId || !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)) return failure('invalid_request', 'Idempotency-Key가 필요합니다(1~128자).', 400);
    const patch = request.method === 'PATCH' ? meetingPatch(await readLimitedJson(request, 512 * 1024)) : {};
    if (request.method === 'DELETE' && request.body) {
      const reader = request.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value.byteLength) { await reader.cancel(); return failure('invalid_request', 'DELETE 요청에는 본문을 보내지 마세요.', 400); }
        }
      } finally { reader.releaseLock(); }
    }
    const payloadHash = createHash('sha256').update(JSON.stringify(patch)).digest('hex');
    const { data, error } = await client.rpc('mutate_agent_meeting', {
      p_key_hash: keyHash, p_request_id: requestId, p_payload_hash: payloadHash,
      p_meeting_id: id, p_operation: request.method, p_patch: patch
    });
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) throw new Error('mutation_failed');
    if (data.error === 'invalid_api_key') return invalidKey();
    if (data.error === 'meeting_not_found') return failure('meeting_not_found', '이 키로 접근할 수 있는 회의록을 찾을 수 없습니다.', 404);
    if (data.error === 'rate_limited') return failure('rate_limited', '키당 분당 60회까지 요청할 수 있습니다.', 429);
    if (data.error === 'idempotency_conflict') return failure('idempotency_conflict', '동일 요청 ID에 다른 대상·작업·내용이 전달되었습니다.', 409);
    if (data.error === 'meeting_deleted') return failure('meeting_deleted', '이 회의록은 삭제되었습니다.', 409);
    if (data.error === 'invalid_request' || data.error === 'invalid_tickets') return failure('invalid_request', '입력 필드와 연결 티켓을 확인하세요.', 400);
    if (data.id !== id || typeof data.replayed !== 'boolean') throw new Error('invalid_mutation_response');
    if (request.method === 'DELETE') return new Response(null, { status: 204 });
    const path = `/teams/meetings/${id}`;
    return Response.json({ meeting: { id, path }, replayed: data.replayed }, { headers: { Location: path } });
  } catch (error) {
    if (error instanceof MeetingInputError) return failure('invalid_request', error.message, 400);
    if (error instanceof RequestBodyError) return failure('invalid_request', error.message, error.status);
    console.error('[meeting-mutation] 요청 처리 실패');
    return failure('service_unavailable', '처리하지 못했습니다. 같은 요청 ID로 다시 시도하세요.', 503);
  }
};
export const PATCH = mutate;
export const DELETE = mutate;
export const GET = agentRead('meetings', true);
export const { OPTIONS, ALL } = agentMethods('GET, PATCH, DELETE, OPTIONS');
