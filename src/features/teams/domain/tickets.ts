import type { Database } from '../server/database.types';

type TicketRow = Database['public']['Tables']['tickets']['Row'];
type TicketTypeRow = Database['public']['Tables']['ticket_types']['Row'];
type TicketStatusRow = Database['public']['Tables']['ticket_statuses']['Row'];
type TeamRow = Database['public']['Tables']['teams']['Row'];
type MemberRow = Database['public']['Tables']['members']['Row'];
type CommentRow = Database['public']['Tables']['ticket_comments']['Row'];
type HistoryRow = Database['public']['Tables']['ticket_history']['Row'];

export const TICKET_STATUSES = ['신규', '배정', '완료'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export type TicketMemberOption = { id: string; name: string; title: string };
export type TicketTeamOption = { id: string; name: string; members: TicketMemberOption[] };
export type TicketTypeOption = { id: string; name: string };
export type TicketStatusOption = { id: string; name: TicketStatus; sortOrder: number };
export type TicketComment = { id: string; author: string; body: string; createdAt: string };
export type TicketHistoryEntry = { id: string; event: string; createdAt: string };

export type TicketRecord = {
  id: string;
  number: string;
  title: string;
  description: string;
  typeId: string;
  typeName: string;
  statusId: string;
  status: TicketStatus;
  teamId: string | null;
  teamName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  comments: TicketComment[];
  history: TicketHistoryEntry[];
};

export type TicketWorkspace = {
  tickets: TicketRecord[];
  teams: TicketTeamOption[];
  types: TicketTypeOption[];
  statuses: TicketStatusOption[];
};

export type CreateTicketInput = {
  title: string;
  description: string;
  typeId: string;
  teamId: string | null;
  assigneeId: string | null;
};

export type UpdateTicketInput = CreateTicketInput & {
  status: TicketStatus;
};

export type TicketCommentInput = { author: string; body: string };
export type TicketFilters = { query: string; status: TicketStatus | null; teamId: string | null };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TICKET_NUMBER_PATTERN = /^T-[0-9]+$/;

export class TicketInputError extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TicketInputError('JSON 객체가 필요합니다.');
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string' || value.trim() === '') throw new TicketInputError(`${label}은(는) 필수입니다.`);
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new TicketInputError(`${label}은(는) ${maxLength}자 이하여야 합니다.`);
  return normalized;
}

export function parseTicketNumber(value: unknown) {
  if (typeof value !== 'string' || !TICKET_NUMBER_PATTERN.test(value)) throw new TicketInputError('티켓 번호 형식이 올바르지 않습니다.');
  return value;
}

function uuid(value: unknown, label: string, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return null;
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw new TicketInputError(`${label} 형식이 올바르지 않습니다.`);
  return value;
}

function status(value: unknown): TicketStatus {
  if (typeof value !== 'string' || !TICKET_STATUSES.includes(value as TicketStatus)) throw new TicketInputError('티켓 상태가 올바르지 않습니다.');
  return value as TicketStatus;
}

function ticketFields(value: unknown): CreateTicketInput {
  const body = record(value);
  const teamId = uuid(body.teamId, '담당 팀 ID', true);
  const assigneeId = uuid(body.assigneeId, '담당자 ID', true);
  if (assigneeId && !teamId) throw new TicketInputError('담당자를 지정하려면 담당 팀이 필요합니다.');
  return {
    title: text(body.title, '티켓 제목', 160),
    description: text(body.description, '티켓 설명', 5000),
    typeId: uuid(body.typeId, '티켓 유형 ID') as string,
    teamId,
    assigneeId
  };
}

export function parseCreateTicketInput(value: unknown): CreateTicketInput {
  return ticketFields(value);
}

export function parseUpdateTicketInput(value: unknown): UpdateTicketInput {
  const body = record(value);
  return { ...ticketFields(body), status: status(body.status) };
}

export function parseTicketCommentInput(value: unknown): TicketCommentInput {
  const body = record(value);
  return {
    author: body.author === undefined || body.author === null || body.author === '' ? '내부 사용자' : text(body.author, '댓글 작성자', 80),
    body: text(body.body, '댓글 내용', 2000)
  };
}

export function parseTicketFilters(url: URL): TicketFilters {
  const rawStatus = url.searchParams.get('status');
  const rawTeamId = url.searchParams.get('teamId');
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 160);
  return {
    query,
    status: rawStatus ? status(rawStatus) : null,
    teamId: rawTeamId ? uuid(rawTeamId, '담당 팀 ID') as string : null
  };
}

export function buildTicketWorkspace(
  ticketRows: TicketRow[],
  teamRows: TeamRow[],
  memberRows: MemberRow[],
  typeRows: TicketTypeRow[],
  statusRows: TicketStatusRow[],
  commentRows: CommentRow[] = [],
  historyRows: HistoryRow[] = []
): TicketWorkspace {
  const membersByTeam = new Map<string, TicketMemberOption[]>();
  const memberById = new Map(memberRows.map((member) => [member.id, member]));
  for (const member of memberRows) {
    const option = { id: member.id, name: member.name, title: member.title };
    membersByTeam.set(member.team_id, [...(membersByTeam.get(member.team_id) ?? []), option]);
  }

  const teamById = new Map(teamRows.map((team) => [team.id, team]));
  const typeById = new Map(typeRows.map((type) => [type.id, type.name]));
  const statusById = new Map(statusRows.map((item) => [item.id, item.name]));
  const commentsByTicket = new Map<string, TicketComment[]>();
  const historyByTicket = new Map<string, TicketHistoryEntry[]>();

  for (const comment of commentRows) {
    const mapped = { id: comment.id, author: comment.author, body: comment.body, createdAt: comment.created_at };
    commentsByTicket.set(comment.ticket_id, [...(commentsByTicket.get(comment.ticket_id) ?? []), mapped]);
  }
  for (const entry of historyRows) {
    const mapped = { id: entry.id, event: entry.event, createdAt: entry.created_at };
    historyByTicket.set(entry.ticket_id, [...(historyByTicket.get(entry.ticket_id) ?? []), mapped]);
  }

  const tickets = ticketRows.map((ticket): TicketRecord => {
    const rawStatus = statusById.get(ticket.status_id);
    if (!rawStatus || !TICKET_STATUSES.includes(rawStatus as TicketStatus)) throw new TicketInputError(`알 수 없는 티켓 상태입니다: ${rawStatus ?? ticket.status_id}`);
    return {
      id: ticket.id,
      number: ticket.ticket_number,
      title: ticket.title,
      description: ticket.description,
      typeId: ticket.type_id,
      typeName: typeById.get(ticket.type_id) ?? '알 수 없음',
      statusId: ticket.status_id,
      status: rawStatus as TicketStatus,
      teamId: ticket.team_id,
      teamName: ticket.team_id ? teamById.get(ticket.team_id)?.name ?? null : null,
      assigneeId: ticket.assignee_id,
      assigneeName: ticket.assignee_id ? memberById.get(ticket.assignee_id)?.name ?? null : null,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      comments: (commentsByTicket.get(ticket.id) ?? []).sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      history: (historyByTicket.get(ticket.id) ?? []).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    };
  });
  tickets.sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    tickets,
    teams: teamRows.map((team) => ({
      id: team.id,
      name: team.name,
      members: (membersByTeam.get(team.id) ?? []).sort((left, right) => left.name.localeCompare(right.name, 'ko'))
    })).sort((left, right) => left.name.localeCompare(right.name, 'ko')),
    types: typeRows.map((type) => ({ id: type.id, name: type.name })).sort((left, right) => left.name.localeCompare(right.name, 'ko')),
    statuses: statusRows.map((item) => ({ id: item.id, name: item.name as TicketStatus, sortOrder: item.sort_order })).sort((left, right) => left.sortOrder - right.sortOrder)
  };
}

export function filterTicketWorkspace(workspace: TicketWorkspace, filters: TicketFilters): TicketWorkspace {
  const normalized = filters.query.toLocaleLowerCase('ko');
  return {
    ...workspace,
    tickets: workspace.tickets.filter((ticket) => {
      const matchesQuery = !normalized || [ticket.number, ticket.title, ticket.description, ticket.typeName, ticket.teamName ?? ''].join(' ').toLocaleLowerCase('ko').includes(normalized);
      return matchesQuery && (!filters.status || ticket.status === filters.status) && (!filters.teamId || ticket.teamId === filters.teamId);
    })
  };
}
