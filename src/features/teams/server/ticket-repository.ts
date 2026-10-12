import type { Json } from './database.types';
import {
  buildTicketWorkspace,
  filterTicketWorkspace,
  type CreateTicketInput,
  type TicketCommentInput,
  type TicketFilters,
  type TicketRecord,
  type UpdateTicketInput
} from '../domain/tickets';
import { getSupabaseServerClient } from '../../../lib/server/supabase';

export class TicketRepositoryError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
  }
}

function fail(message: string, error: { message: string; code?: string } | null) {
  if (error) throw new TicketRepositoryError(error.message || message, error.code);
}

function rpcText(value: Json, key: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TicketRepositoryError('티켓 RPC 응답이 올바르지 않습니다.');
  const result = value[key];
  if (typeof result !== 'string') throw new TicketRepositoryError(`티켓 RPC 응답에 ${key} 값이 없습니다.`);
  return result;
}

export async function listTickets(filters: TicketFilters = { query: '', status: null, teamId: null }) {
  const client = getSupabaseServerClient();
  const [ticketsResult, teamsResult, membersResult, typesResult, statusesResult] = await Promise.all([
    client.from('tickets').select('*').order('created_at', { ascending: false }),
    client.from('teams').select('*').order('name'),
    client.from('members').select('*').order('sort_order'),
    client.from('ticket_types').select('*').order('name'),
    client.from('ticket_statuses').select('*').order('sort_order')
  ]);

  fail('티켓 목록을 불러오지 못했습니다.', ticketsResult.error);
  fail('담당 팀 목록을 불러오지 못했습니다.', teamsResult.error);
  fail('담당자 목록을 불러오지 못했습니다.', membersResult.error);
  fail('티켓 유형을 불러오지 못했습니다.', typesResult.error);
  fail('티켓 상태를 불러오지 못했습니다.', statusesResult.error);

  const workspace = buildTicketWorkspace(
    ticketsResult.data ?? [],
    teamsResult.data ?? [],
    membersResult.data ?? [],
    typesResult.data ?? [],
    statusesResult.data ?? []
  );
  return filterTicketWorkspace(workspace, filters);
}

export async function getTicket(ticketNumber: string): Promise<TicketRecord | null> {
  const client = getSupabaseServerClient();
  const ticketResult = await client.from('tickets').select('*').eq('ticket_number', ticketNumber).maybeSingle();
  fail('티켓을 불러오지 못했습니다.', ticketResult.error);
  if (!ticketResult.data) return null;

  const ticket = ticketResult.data;
  const [teamsResult, membersResult, typesResult, statusesResult, commentsResult, historyResult] = await Promise.all([
    client.from('teams').select('*').eq('id', ticket.team_id ?? '00000000-0000-0000-0000-000000000000'),
    client.from('members').select('*').eq('id', ticket.assignee_id ?? '00000000-0000-0000-0000-000000000000'),
    client.from('ticket_types').select('*').eq('id', ticket.type_id),
    client.from('ticket_statuses').select('*').eq('id', ticket.status_id),
    client.from('ticket_comments').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: false }),
    client.from('ticket_history').select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: false })
  ]);

  fail('담당 팀을 불러오지 못했습니다.', teamsResult.error);
  fail('담당자를 불러오지 못했습니다.', membersResult.error);
  fail('티켓 유형을 불러오지 못했습니다.', typesResult.error);
  fail('티켓 상태를 불러오지 못했습니다.', statusesResult.error);
  fail('티켓 댓글을 불러오지 못했습니다.', commentsResult.error);
  fail('티켓 이력을 불러오지 못했습니다.', historyResult.error);

  return buildTicketWorkspace(
    [ticket],
    teamsResult.data ?? [],
    membersResult.data ?? [],
    typesResult.data ?? [],
    statusesResult.data ?? [],
    commentsResult.data ?? [],
    historyResult.data ?? []
  ).tickets[0] ?? null;
}

export async function createTicket(input: CreateTicketInput) {
  const client = getSupabaseServerClient();
  const { data, error } = await client.rpc('create_ticket', {
    p_title: input.title,
    p_description: input.description,
    p_type_id: input.typeId,
    ...(input.teamId ? { p_team_id: input.teamId } : {}),
    ...(input.assigneeId ? { p_assignee_id: input.assigneeId } : {})
  });
  fail('티켓을 생성하지 못했습니다.', error);
  const ticket = await getTicket(rpcText(data, 'ticketNumber'));
  if (!ticket) throw new TicketRepositoryError('생성된 티켓을 다시 불러오지 못했습니다.');
  return ticket;
}

export async function updateTicket(ticketNumber: string, input: UpdateTicketInput) {
  const client = getSupabaseServerClient();
  const { data, error } = await client.rpc('update_ticket', {
    p_ticket_number: ticketNumber,
    p_title: input.title,
    p_description: input.description,
    p_type_id: input.typeId,
    p_status: input.status,
    ...(input.teamId ? { p_team_id: input.teamId } : {}),
    ...(input.assigneeId ? { p_assignee_id: input.assigneeId } : {})
  });
  fail('티켓을 수정하지 못했습니다.', error);
  const ticket = await getTicket(rpcText(data, 'ticketNumber'));
  if (!ticket) throw new TicketRepositoryError('수정된 티켓을 다시 불러오지 못했습니다.');
  return ticket;
}

export async function deleteTicket(ticketNumber: string) {
  const client = getSupabaseServerClient();
  const { data, error } = await client.rpc('delete_ticket', { p_ticket_number: ticketNumber });
  fail('티켓을 삭제하지 못했습니다.', error);
  rpcText(data, 'ticketNumber');
}

export async function listTicketComments(ticketNumber: string) {
  const ticket = await getTicket(ticketNumber);
  if (!ticket) throw new TicketRepositoryError('티켓을 찾을 수 없습니다.', 'NOT_FOUND');
  return ticket.comments;
}

export async function addTicketComment(ticketNumber: string, input: TicketCommentInput) {
  const client = getSupabaseServerClient();
  const { data, error } = await client.rpc('add_ticket_comment', {
    p_ticket_number: ticketNumber,
    p_author: input.author,
    p_body: input.body
  });
  fail('댓글을 등록하지 못했습니다.', error);
  const commentId = rpcText(data, 'commentId');
  const { data: comment, error: commentError } = await client.from('ticket_comments').select('*').eq('id', commentId).single();
  fail('등록한 댓글을 다시 불러오지 못했습니다.', commentError);
  if (!comment) throw new TicketRepositoryError('등록한 댓글을 다시 불러오지 못했습니다.');
  return {
    id: comment.id,
    author: comment.author,
    body: comment.body,
    createdAt: comment.created_at
  };
}
