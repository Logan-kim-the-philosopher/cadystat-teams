import { agentRead, agentMethods } from '../../../features/teams/server/agent-api';
import { createHash } from 'node:crypto';
import type { APIRoute } from 'astro';
import { meetingInput, MeetingInputError } from '../../../features/teams/domain/meetings';
import { getSupabaseServerClient } from '../../../lib/server/supabase';
import { meetingApiKeyHashFromHeader } from '../../../lib/server/meeting-api-keys.mjs';
import { readLimitedJson, RequestBodyError } from '../../../lib/server/limited-json';

export const prerender = false;
function failure(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status, headers: {
    ...(status === 401 ? { 'WWW-Authenticate': 'Bearer realm="meeting-upload"' } : {}),
    ...(status === 429 ? { 'Retry-After': '60' } : {})
  } });
}
const invalidKey = () => failure('invalid_api_key', '유효한 회의록 API 키가 필요합니다.', 401);

export const POST: APIRoute = async ({ request, url }) => {
  const keyHash = meetingApiKeyHashFromHeader(request.headers.get('authorization'));
  if (!keyHash) return invalidKey();
  try {
    const client = getSupabaseServerClient();
    // Reject invalid credentials before reading the upload; the RPC checks again
    // under a row lock to honor revocation/expiry concurrent with an upload.
    const key = await client.from('meeting_api_keys').select('id').eq('key_hash', keyHash)
      .is('revoked_at', null).gt('expires_at', new Date().toISOString()).maybeSingle();
    if (key.error) throw new Error('key_lookup_failed');
    if (!key.data) return invalidKey();
    if (url.search) return failure('invalid_request', '이 API는 query parameter를 받지 않습니다.', 400);
    const requestId = request.headers.get('idempotency-key');
    if (!requestId || !/^[A-Za-z0-9._:-]{1,128}$/.test(requestId)) {
      return failure('invalid_request', 'Idempotency-Key 헤더에 요청별 고유 ID(1~128자)가 필요합니다.', 400);
    }
    const raw = await readLimitedJson(request, 512 * 1024);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new MeetingInputError('JSON 객체가 필요합니다.');
    const value = raw as Record<string, unknown>;
    if (Object.keys(value).some((name) => !['title', 'date', 'content', 'status', 'ticketIds', 'newTickets'].includes(name))) {
      throw new MeetingInputError('허용되지 않은 입력 필드가 있습니다.');
    }
    const input = meetingInput({ ...value, status: value.status ?? 'published', ticketIds: value.ticketIds ?? [] });
    input.ticketIds.sort();
    const payloadHash = createHash('sha256').update(JSON.stringify({ title: input.title, date: input.date, content: input.content, status: input.status, ticketIds: input.ticketIds, ...(input.newTickets.length ? { newTickets: input.newTickets } : {}) })).digest('hex');
    const { data, error } = await client.rpc('create_agent_meeting', {
      p_key_hash: keyHash, p_request_id: requestId, p_payload_hash: payloadHash,
      p_title: input.title, p_meeting_date: input.date, p_content: input.content,
      p_status: input.status, p_ticket_ids: input.ticketIds, p_new_tickets: input.newTickets
    });
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) throw new Error('upload_failed');
    if (data.error === 'invalid_api_key') return invalidKey();
    if (data.error === 'rate_limited') return failure('rate_limited', '키당 분당 60회까지 요청할 수 있습니다.', 429);
    if (data.error === 'idempotency_conflict') return failure('idempotency_conflict', '동일한 요청 ID에 다른 내용이 전달되었습니다.', 409);
    if (data.error === 'meeting_deleted') return failure('meeting_deleted', '이 요청으로 생성한 회의록은 삭제되었습니다.', 409);
    if (data.error === 'invalid_tickets' || data.error === 'invalid_request') return failure('invalid_request', '요청 ID 또는 연결 티켓을 확인하세요.', 400);
    if (typeof data.id !== 'string' || typeof data.replayed !== 'boolean') throw new Error('invalid_upload_response');
    const path = `/teams/meetings/${data.id}`;
    return Response.json({ meeting: { id: data.id, path }, replayed: data.replayed }, {
      status: data.replayed ? 200 : 201, headers: { Location: path }
    });
  } catch (error) {
    if (error instanceof MeetingInputError) return failure('invalid_request', error.message, 400);
    if (error instanceof RequestBodyError) return failure('invalid_request', error.message, error.status);
    // Never log request headers, key hashes, uploaded content, or raw SDK errors.
    console.error('[meeting-upload] 요청 처리 실패');
    return failure('service_unavailable', '회의록을 저장하지 못했습니다. 같은 요청 ID로 다시 시도하세요.', 503);
  }
};

export const GET = agentRead('meetings', false);
export const { OPTIONS, ALL } = agentMethods('GET, POST, OPTIONS');
