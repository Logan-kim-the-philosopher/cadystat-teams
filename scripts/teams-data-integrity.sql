-- Read-only pre/post migration snapshot. Run with psql -X -v ON_ERROR_STOP=1 -f.
with row_counts as (
  select jsonb_object_agg(table_name, row_count order by table_name) value
  from (
    select 'meeting_api_key_role_events' table_name, count(*) row_count from public.meeting_api_key_role_events
    union all select 'meeting_api_keys', count(*) from public.meeting_api_keys
    union all select 'meeting_api_mutations', count(*) from public.meeting_api_mutations
    union all select 'meeting_api_uploads', count(*) from public.meeting_api_uploads
    union all select 'meeting_comments', count(*) from public.meeting_comments
    union all select 'meeting_note_tickets', count(*) from public.meeting_note_tickets
    union all select 'meeting_notes', count(*) from public.meeting_notes
    union all select 'members', count(*) from public.members
    union all select 'teams', count(*) from public.teams
    union all select 'ticket_api_mutations', count(*) from public.ticket_api_mutations
    union all select 'ticket_comments', count(*) from public.ticket_comments
    union all select 'ticket_history', count(*) from public.ticket_history
    union all select 'ticket_statuses', count(*) from public.ticket_statuses
    union all select 'ticket_types', count(*) from public.ticket_types
    union all select 'tickets', count(*) from public.tickets
  ) counts
), integrity as (
  select jsonb_build_object(
    'member_without_team', (select count(*) from public.members m left join public.teams t on t.id=m.team_id where t.id is null),
    'ticket_without_type', (select count(*) from public.tickets t left join public.ticket_types ty on ty.id=t.type_id where ty.id is null),
    'ticket_without_status', (select count(*) from public.tickets t left join public.ticket_statuses s on s.id=t.status_id where s.id is null),
    'comment_without_ticket', (select count(*) from public.ticket_comments c left join public.tickets t on t.id=c.ticket_id where t.id is null),
    'history_without_ticket', (select count(*) from public.ticket_history h left join public.tickets t on t.id=h.ticket_id where t.id is null),
    'comment_without_meeting', (select count(*) from public.meeting_comments c left join public.meeting_notes n on n.id=c.meeting_note_id where n.id is null),
    'meeting_link_without_note', (select count(*) from public.meeting_note_tickets l left join public.meeting_notes n on n.id=l.meeting_note_id where n.id is null),
    'meeting_link_without_ticket', (select count(*) from public.meeting_note_tickets l left join public.tickets t on t.id=l.ticket_id where t.id is null),
    'duplicate_ticket_number', (select count(*) from (select ticket_number from public.tickets group by ticket_number having count(*)>1) duplicates)
  ) value
)
select jsonb_pretty(jsonb_build_object(
  'captured_at', current_timestamp,
  'row_counts', row_counts.value,
  'integrity_violations', integrity.value
))
from row_counts cross join integrity;
