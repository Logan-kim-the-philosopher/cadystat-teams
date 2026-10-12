import { meetingId, meetingText, MeetingInputError } from './meetings.ts';

export function agentPagination(url: URL, collection: boolean) {
  const allowed = collection ? ['limit', 'offset', 'q'] : [];
  for (const name of url.searchParams.keys()) {
    if (!allowed.includes(name) || url.searchParams.getAll(name).length !== 1) throw new MeetingInputError('지원하지 않는 query parameter입니다.');
  }
  function integer(name: string, fallback: number, min: number, max: number) {
    const raw = url.searchParams.get(name);
    if (raw === null) return fallback;
    if (!/^\d+$/.test(raw) || Number(raw) < min || Number(raw) > max) throw new MeetingInputError(`${name} 범위를 확인하세요.`);
    return Number(raw);
  }
  const query = url.searchParams.get('q') ?? '';
  if (query.length > 160) throw new MeetingInputError('검색어는 160자 이하여야 합니다.');
  return { limit: integer('limit', 20, 1, 100), offset: integer('offset', 0, 0, 1000000), query };
}

export function agentTicketInput(value: unknown, method: 'POST' | 'PATCH') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MeetingInputError('JSON 객체가 필요합니다.');
  const body = value as Record<string, unknown>;
  const allowed = ['title', 'description', 'typeId', 'teamId', 'assigneeId', ...(method === 'PATCH' ? ['status'] : [])];
  if (!Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) throw new MeetingInputError('허용된 티켓 필드를 지정하세요.');
  const result: Record<string, string | null> = {};
  for (const [name, label, max] of [['title', '제목', 160], ['description', '설명', 5000]] as const) {
    if (Object.hasOwn(body, name) || method === 'POST') result[name] = meetingText(body[name], label, max);
  }
  if (Object.hasOwn(body, 'typeId') || method === 'POST') result.typeId = meetingId(body.typeId);
  if (Object.hasOwn(body, 'status')) {
    if (typeof body.status !== 'string' || !['신규', '배정', '완료'].includes(body.status)) throw new MeetingInputError('티켓 상태가 올바르지 않습니다.');
    result.status = body.status;
  }
  for (const name of ['teamId', 'assigneeId']) {
    if (Object.hasOwn(body, name)) result[name] = body[name] === null ? null : meetingId(body[name]);
  }
  return result;
}
