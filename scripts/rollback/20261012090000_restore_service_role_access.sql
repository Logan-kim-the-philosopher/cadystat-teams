-- Emergency compensation for 20261012090000_transfer_teams_runtime_access.sql.
-- Run only after traffic is returned to the previous Cody Stat upstream.
begin;

drop policy if exists teams_runtime_read on public.teams;
drop policy if exists teams_runtime_read on public.members;
drop policy if exists teams_runtime_read on public.ticket_types;
drop policy if exists teams_runtime_read on public.ticket_statuses;
drop policy if exists teams_runtime_read on public.tickets;
drop policy if exists teams_runtime_read on public.ticket_comments;
drop policy if exists teams_runtime_read on public.ticket_history;
drop policy if exists teams_runtime_read on public.meeting_notes;
drop policy if exists teams_runtime_read on public.meeting_comments;
drop policy if exists teams_runtime_read on public.meeting_note_tickets;
drop policy if exists teams_runtime_read on public.meeting_api_keys;
drop policy if exists teams_runtime_read on public.meeting_api_uploads;
drop policy if exists teams_runtime_read on public.meeting_api_mutations;
drop policy if exists teams_runtime_read on public.meeting_api_key_role_events;
drop policy if exists teams_runtime_read on public.ticket_api_mutations;
drop policy if exists teams_runtime_soft_delete on public.meeting_notes;
drop policy if exists teams_runtime_comment_delete on public.meeting_comments;
drop policy if exists teams_runtime_key_insert on public.meeting_api_keys;
drop policy if exists teams_runtime_key_update on public.meeting_api_keys;

revoke all on table
  public.teams,
  public.members,
  public.ticket_types,
  public.ticket_statuses,
  public.tickets,
  public.ticket_comments,
  public.ticket_history,
  public.meeting_notes,
  public.meeting_comments,
  public.meeting_note_tickets,
  public.meeting_api_keys,
  public.meeting_api_uploads,
  public.meeting_api_mutations,
  public.meeting_api_key_role_events,
  public.ticket_api_mutations
from teams_runtime;

grant all on table
  public.teams,
  public.members,
  public.ticket_types,
  public.ticket_statuses,
  public.tickets,
  public.ticket_comments,
  public.ticket_history,
  public.meeting_notes,
  public.meeting_comments,
  public.meeting_note_tickets,
  public.meeting_api_keys,
  public.meeting_api_uploads,
  public.meeting_api_mutations,
  public.meeting_api_key_role_events,
  public.ticket_api_mutations
to service_role;

grant usage, select on sequence public.ticket_number_seq, public.meeting_api_key_role_events_id_seq to service_role;

revoke all on function public.save_organization_team(uuid,text,uuid,jsonb) from teams_runtime;
revoke all on function public.create_organization_team(text,uuid,text,text,text) from teams_runtime;
revoke all on function public.delete_organization_team(uuid) from teams_runtime;
revoke all on function public.create_ticket(text,text,uuid,uuid,uuid) from teams_runtime;
revoke all on function public.update_ticket(text,text,text,uuid,text,uuid,uuid) from teams_runtime;
revoke all on function public.delete_ticket(text) from teams_runtime;
revoke all on function public.add_ticket_comment(text,text,text) from teams_runtime;
revoke all on function public.save_meeting_note(text,date,text,text,uuid[],uuid) from teams_runtime;
revoke all on function public.add_meeting_comment(uuid,text,text) from teams_runtime;
revoke all on function public.create_agent_meeting(text,text,text,text,date,text,text,uuid[],jsonb) from teams_runtime;
revoke all on function public.save_meeting_with_tickets(text,date,text,text,uuid[],uuid,jsonb) from teams_runtime;
revoke all on function public.mutate_agent_meeting(text,text,text,uuid,text,jsonb) from teams_runtime;
revoke all on function public.set_meeting_api_key_role(uuid,text) from teams_runtime;
revoke all on function public.authorize_agent_api_key(text,boolean) from teams_runtime;
revoke all on function public.read_agent_api(text,text,text,integer,integer,text) from teams_runtime;
revoke all on function public.mutate_agent_ticket(text,text,text,text,text,jsonb) from teams_runtime;

grant execute on function public.save_organization_team(uuid,text,uuid,jsonb) to service_role;
grant execute on function public.create_organization_team(text,uuid,text,text,text) to service_role;
grant execute on function public.delete_organization_team(uuid) to service_role;
grant execute on function public.create_ticket(text,text,uuid,uuid,uuid) to service_role;
grant execute on function public.update_ticket(text,text,text,uuid,text,uuid,uuid) to service_role;
grant execute on function public.delete_ticket(text) to service_role;
grant execute on function public.add_ticket_comment(text,text,text) to service_role;
grant execute on function public.save_meeting_note(text,date,text,text,uuid[],uuid) to service_role;
grant execute on function public.add_meeting_comment(uuid,text,text) to service_role;
grant execute on function public.create_agent_meeting(text,text,text,text,date,text,text,uuid[],jsonb) to service_role;
grant execute on function public.save_meeting_with_tickets(text,date,text,text,uuid[],uuid,jsonb) to service_role;
grant execute on function public.mutate_agent_meeting(text,text,text,uuid,text,jsonb) to service_role;
grant execute on function public.set_meeting_api_key_role(uuid,text) to service_role;
grant execute on function public.authorize_agent_api_key(text,boolean) to service_role;
grant execute on function public.agent_ticket_json(public.tickets,boolean) to service_role;
grant execute on function public.read_agent_api(text,text,text,integer,integer,text) to service_role;
grant execute on function public.mutate_agent_ticket(text,text,text,text,text,jsonb) to service_role;

commit;
