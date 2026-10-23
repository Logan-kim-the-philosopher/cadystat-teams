do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'teams_runtime') then
    create role teams_runtime nologin noinherit nobypassrls;
  end if;
end
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    grant teams_runtime to authenticator;
  end if;
end
$$;

grant usage on schema public to teams_runtime;

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
from service_role;

revoke all on sequence public.ticket_number_seq, public.meeting_api_key_role_events_id_seq from service_role;

grant select on table
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
to teams_runtime;

grant update on table public.meeting_notes to teams_runtime;
grant delete on table public.meeting_comments to teams_runtime;
grant insert, update on table public.meeting_api_keys to teams_runtime;

revoke all on function public.save_organization_team(uuid,text,uuid,jsonb) from service_role;
revoke all on function public.create_organization_team(text,uuid,text,text,text) from service_role;
revoke all on function public.delete_organization_team(uuid) from service_role;
revoke all on function public.create_ticket(text,text,uuid,uuid,uuid) from service_role;
revoke all on function public.update_ticket(text,text,text,uuid,text,uuid,uuid) from service_role;
revoke all on function public.delete_ticket(text) from service_role;
revoke all on function public.add_ticket_comment(text,text,text) from service_role;
revoke all on function public.save_meeting_note(text,date,text,text,uuid[],uuid) from service_role;
revoke all on function public.add_meeting_comment(uuid,text,text) from service_role;
revoke all on function public.create_agent_meeting(text,text,text,text,date,text,text,uuid[],jsonb) from service_role;
revoke all on function public.save_meeting_with_tickets(text,date,text,text,uuid[],uuid,jsonb) from service_role;
revoke all on function public.mutate_agent_meeting(text,text,text,uuid,text,jsonb) from service_role;
revoke all on function public.set_meeting_api_key_role(uuid,text) from service_role;
revoke all on function public.authorize_agent_api_key(text,boolean) from service_role;
revoke all on function public.agent_ticket_json(public.tickets,boolean) from service_role;
revoke all on function public.read_agent_api(text,text,text,integer,integer,text) from service_role;
revoke all on function public.mutate_agent_ticket(text,text,text,text,text,jsonb) from service_role;

grant execute on function public.save_organization_team(uuid,text,uuid,jsonb) to teams_runtime;
grant execute on function public.create_organization_team(text,uuid,text,text,text) to teams_runtime;
grant execute on function public.delete_organization_team(uuid) to teams_runtime;
grant execute on function public.create_ticket(text,text,uuid,uuid,uuid) to teams_runtime;
grant execute on function public.update_ticket(text,text,text,uuid,text,uuid,uuid) to teams_runtime;
grant execute on function public.delete_ticket(text) to teams_runtime;
grant execute on function public.add_ticket_comment(text,text,text) to teams_runtime;
grant execute on function public.save_meeting_note(text,date,text,text,uuid[],uuid) to teams_runtime;
grant execute on function public.add_meeting_comment(uuid,text,text) to teams_runtime;
grant execute on function public.create_agent_meeting(text,text,text,text,date,text,text,uuid[],jsonb) to teams_runtime;
grant execute on function public.save_meeting_with_tickets(text,date,text,text,uuid[],uuid,jsonb) to teams_runtime;
grant execute on function public.mutate_agent_meeting(text,text,text,uuid,text,jsonb) to teams_runtime;
grant execute on function public.set_meeting_api_key_role(uuid,text) to teams_runtime;
grant execute on function public.authorize_agent_api_key(text,boolean) to teams_runtime;
grant execute on function public.read_agent_api(text,text,text,integer,integer,text) to teams_runtime;
grant execute on function public.mutate_agent_ticket(text,text,text,text,text,jsonb) to teams_runtime;

create policy teams_runtime_read on public.teams for select to teams_runtime using (true);
create policy teams_runtime_read on public.members for select to teams_runtime using (true);
create policy teams_runtime_read on public.ticket_types for select to teams_runtime using (true);
create policy teams_runtime_read on public.ticket_statuses for select to teams_runtime using (true);
create policy teams_runtime_read on public.tickets for select to teams_runtime using (true);
create policy teams_runtime_read on public.ticket_comments for select to teams_runtime using (true);
create policy teams_runtime_read on public.ticket_history for select to teams_runtime using (true);
create policy teams_runtime_read on public.meeting_notes for select to teams_runtime using (true);
create policy teams_runtime_read on public.meeting_comments for select to teams_runtime using (true);
create policy teams_runtime_read on public.meeting_note_tickets for select to teams_runtime using (true);
create policy teams_runtime_read on public.meeting_api_keys for select to teams_runtime using (true);
create policy teams_runtime_read on public.meeting_api_uploads for select to teams_runtime using (true);
create policy teams_runtime_read on public.meeting_api_mutations for select to teams_runtime using (true);
create policy teams_runtime_read on public.meeting_api_key_role_events for select to teams_runtime using (true);
create policy teams_runtime_read on public.ticket_api_mutations for select to teams_runtime using (true);

create policy teams_runtime_soft_delete on public.meeting_notes
  for update to teams_runtime using (true) with check (true);
create policy teams_runtime_comment_delete on public.meeting_comments
  for delete to teams_runtime using (true);
create policy teams_runtime_key_insert on public.meeting_api_keys
  for insert to teams_runtime with check (true);
create policy teams_runtime_key_update on public.meeting_api_keys
  for update to teams_runtime using (true) with check (true);
