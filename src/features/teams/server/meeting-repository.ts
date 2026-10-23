import { getSupabaseServerClient } from '../../../lib/server/supabase';
import type { MeetingInput, MeetingNote, MeetingStatus, MeetingWorkspace, RecentMeetingComment } from '../domain/meetings';

export class MeetingRepositoryError extends Error {}
function fail(error: { message: string } | null) { if (error) throw new MeetingRepositoryError(error.message); }

export async function getNextMeetingSchedule(): Promise<string | null> {
  const { data, error } = await getSupabaseServerClient().from('meeting_notes')
    .select('next_meeting_at').eq('status', 'published').is('deleted_at', null)
    .order('meeting_date', { ascending: false }).order('created_at', { ascending: false }).limit(1).maybeSingle();
  fail(error);
  return data?.next_meeting_at ?? null;
}

export async function saveNextMeetingSchedule(startsAt: string): Promise<string> {
  const client = getSupabaseServerClient();
  const { data: latest, error: lookupError } = await client.from('meeting_notes')
    .select('id').eq('status', 'published').is('deleted_at', null)
    .order('meeting_date', { ascending: false }).order('created_at', { ascending: false }).limit(1).maybeSingle();
  fail(lookupError);
  if (!latest) throw new MeetingRepositoryError('최근 회의록을 찾을 수 없습니다.');
  const { data, error } = await client.from('meeting_notes').update({ next_meeting_at: startsAt })
    .eq('id', latest.id).select('next_meeting_at').single();
  fail(error);
  if (!data?.next_meeting_at) throw new MeetingRepositoryError('일정 저장 응답이 없습니다.');
  return data.next_meeting_at;
}

export async function listMeetings(): Promise<MeetingWorkspace> {
  const client = getSupabaseServerClient();
  const [notes, links, tickets, comments] = await Promise.all([
    client.from('meeting_notes').select('*').is('deleted_at', null).order('meeting_date', { ascending: false }),
    client.from('meeting_note_tickets').select('*'),
    client.from('tickets').select('id,ticket_number,title'),
    client.from('meeting_comments').select('*').order('created_at', { ascending: false })
  ]);
  for (const result of [notes, links, tickets, comments]) fail(result.error);
  const options = (tickets.data ?? []).map((ticket) => ({ id: ticket.id, number: ticket.ticket_number, title: ticket.title }));
  return {
    tickets: options,
    notes: (notes.data ?? []).map((note) => ({ id: note.id, title: note.title, date: note.meeting_date, content: note.content, status: note.status as MeetingStatus,
      tickets: options.filter((ticket) => links.data?.some((link) => link.meeting_note_id === note.id && link.ticket_id === ticket.id)),
      comments: (comments.data ?? []).filter((comment) => comment.meeting_note_id === note.id).map((comment) => ({ id: comment.id, author: comment.author, body: comment.body, createdAt: comment.created_at }))
    }))
  };
}
export async function getMeeting(id: string): Promise<MeetingNote | null> { return (await listMeetings()).notes.find((note) => note.id === id) ?? null; }
export async function saveMeeting(input: MeetingInput, id?: string) {
  if (id && !await getMeeting(id)) throw new MeetingRepositoryError('회의록을 찾을 수 없습니다.');
  const { data, error } = await getSupabaseServerClient().rpc('save_meeting_with_tickets', {
    p_title: input.title, p_meeting_date: input.date, p_content: input.content, p_status: input.status,
    p_ticket_ids: input.ticketIds, p_new_tickets: input.newTickets, ...(id ? { p_meeting_id: id } : {})
  });
  fail(error);
  if (!data) throw new MeetingRepositoryError('회의 저장 응답이 없습니다.');
  const note = await getMeeting(data);
  if (!note) throw new MeetingRepositoryError('회의록을 찾을 수 없습니다.');
  return note;
}
export async function addMeetingComment(id: string, body: string, author?: string) {
  if (!await getMeeting(id)) throw new MeetingRepositoryError('회의록을 찾을 수 없습니다.');
  const { error } = await getSupabaseServerClient().rpc('add_meeting_comment', { p_meeting_id: id, p_body: body, ...(author ? { p_author: author } : {}) });
  fail(error);
  return (await getMeeting(id))?.comments ?? [];
}

export async function deleteMeeting(id: string) {
  const { data, error } = await getSupabaseServerClient().from('meeting_notes')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null).select('id').maybeSingle();
  fail(error);
  if (!data) throw new MeetingRepositoryError('회의록을 찾을 수 없습니다.');
}

export async function recentMeetingComments(): Promise<RecentMeetingComment[]> {
  const { data, error } = await getSupabaseServerClient().from('meeting_comments')
    .select('id,author,body,created_at,meeting_notes!inner(id,title,deleted_at)')
    .is('meeting_notes.deleted_at', null).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(20);
  fail(error);
  return (data ?? []).map((comment) => ({
    id: comment.id, author: comment.author, body: comment.body, createdAt: comment.created_at,
    meetingId: comment.meeting_notes.id, meetingTitle: comment.meeting_notes.title
  }));
}
export async function deleteMeetingComment(id: string, commentId: string) {
  if (!await getMeeting(id)) throw new MeetingRepositoryError('회의록을 찾을 수 없습니다.');
  const { data, error } = await getSupabaseServerClient().from('meeting_comments').delete()
    .eq('id', commentId).eq('meeting_note_id', id).select('id').maybeSingle();
  fail(error);
  if (!data) throw new MeetingRepositoryError('댓글을 찾을 수 없습니다.');
}
