import { getSupabaseServerClient } from '../../../lib/server/supabase';
export async function getTeamsSummary() {
  const client = getSupabaseServerClient();
  const [teams, tickets, meetings, statuses] = await Promise.all([
    client.from('teams').select('id', { count: 'exact', head: true }),
    client.from('tickets').select('status_id'),
    client.from('meeting_notes').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    client.from('ticket_statuses').select('id,name')
  ]);
  for (const result of [teams, tickets, meetings, statuses]) if (result.error) throw new Error('Teams 요약 조회 실패');
  const completed = statuses.data?.find((status) => status.name === '완료')?.id;
  return [teams.count ?? 0, tickets.data?.filter((ticket) => ticket.status_id !== completed).length ?? 0, meetings.count ?? 0];
}
