export type MeetingStatus = 'draft' | 'published' | 'archived';
export type MeetingComment = { id: string; author: string; body: string; createdAt: string };
export type MeetingTicketDraft = { title: string; description: string; type: '기능 요청' | '버그' };
export type RecentMeetingComment = MeetingComment & { meetingId: string; meetingTitle: string };
export type MeetingTicket = { id: string; number: string; title: string };
export type MeetingNote = { id: string; title: string; date: string; content: string; status: MeetingStatus; tickets: MeetingTicket[]; comments: MeetingComment[] };
export type MeetingWorkspace = { notes: MeetingNote[]; tickets: MeetingTicket[] };
export type MeetingInput = { title: string; date: string; content: string; status: MeetingStatus; ticketIds: string[]; newTickets: MeetingTicketDraft[] };
export class MeetingInputError extends Error {}

export function meetingScheduleInput(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MeetingInputError('JSON 객체가 필요합니다.');
  const startsAt = (value as Record<string, unknown>).starts_at;
  if (typeof startsAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(startsAt)) {
    throw new MeetingInputError('올바른 날짜와 시간을 입력하세요.');
  }
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 19) !== startsAt.slice(0, 19)) {
    throw new MeetingInputError('올바른 날짜와 시간을 입력하세요.');
  }
  return date.toISOString();
}

export function meetingId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) throw new MeetingInputError('회의록·티켓 ID 형식이 올바르지 않습니다.');
  return value.toLowerCase();
}
export function meetingText(value: unknown, label: string, limit: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) throw new MeetingInputError(`${label}은 1~${limit}자여야 합니다.`);
  return value.trim();
}
export function meetingInput(value: unknown): MeetingInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MeetingInputError('JSON 객체가 필요합니다.');
  const body = value as Record<string, unknown>;
  if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !Number.isFinite(Date.parse(body.date)) || new Date(body.date).toISOString().slice(0, 10) !== body.date) throw new MeetingInputError('회의 날짜가 올바르지 않습니다.');
  if (!['draft', 'published', 'archived'].includes(String(body.status))) throw new MeetingInputError('회의 상태가 올바르지 않습니다.');
  if (typeof body.content !== 'string' || body.content.length > 50000) throw new MeetingInputError('본문은 50000자 이하여야 합니다.');
  if (!Array.isArray(body.ticketIds) || body.ticketIds.length > 100) throw new MeetingInputError('연결 티켓 목록은 100개 이하여야 합니다.');
  const newTickets = meetingTicketDrafts(body.newTickets);
  if (body.ticketIds.length + newTickets.length > 100) throw new MeetingInputError('연결 티켓은 100개 이하여야 합니다.');
  return { newTickets, title: meetingText(body.title, '회의 제목', 160), date: body.date, content: body.content, status: body.status as MeetingStatus, ticketIds: [...new Set(body.ticketIds.map(meetingId))] };
}

export function meetingTicketDrafts(value: unknown): MeetingTicketDraft[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) throw new MeetingInputError('새 티켓은 20개 이하여야 합니다.');
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some((key) => !['title', 'description', 'type'].includes(key))) throw new MeetingInputError('새 티켓 형식이 올바르지 않습니다.');
    const type = item.type ?? '기능 요청';
    if (type !== '기능 요청' && type !== '버그') throw new MeetingInputError('티켓 유형은 기능 요청 또는 버그여야 합니다.');
    return { title: meetingText(item.title, '티켓 제목', 160), description: meetingText(item.description, '티켓 설명', 5000), type };
  });
}

export function meetingPatch(value: unknown): Partial<Omit<MeetingInput, 'newTickets'>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MeetingInputError('JSON 객체가 필요합니다.');
  const patch = value as Record<string, unknown>;
  const fields = ['title', 'date', 'content', 'status', 'ticketIds'];
  if (!Object.keys(patch).length || Object.keys(patch).some((key) => !fields.includes(key))) throw new MeetingInputError('수정 가능한 필드를 하나 이상 지정하세요.');
  const normalized = meetingInput({ title: '검증', date: '2000-01-01', content: '', status: 'published', ticketIds: [], ...patch });
  const result: Record<string, unknown> = {};
  for (const field of fields) if (Object.hasOwn(patch, field)) result[field] = normalized[field as keyof typeof normalized];
  if (Array.isArray(result.ticketIds)) result.ticketIds.sort();
  return result;
}
