create or replace function public.delete_organization_team(
  p_team_id uuid,
  p_ticket_action text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_ticket_count bigint;
  new_status_id uuid;
begin
  perform 1 from public.teams where id = p_team_id for update;
  if not found then
    raise exception '팀을 찾을 수 없습니다.';
  end if;

  if exists (select 1 from public.teams where parent_team_id = p_team_id) then
    raise exception '하위 팀이 있는 팀은 삭제할 수 없습니다.';
  end if;

  if p_ticket_action is not null and p_ticket_action not in ('delete', 'reset') then
    raise exception '지원하지 않는 티켓 처리 방식입니다.';
  end if;

  select count(*) into linked_ticket_count
  from public.tickets
  where team_id = p_team_id;

  if linked_ticket_count > 0 and p_ticket_action is null then
    raise exception '팀에 연결된 티켓 %개가 있습니다. 삭제 또는 신규로 되돌리기를 선택해 주세요.', linked_ticket_count;
  end if;

  if p_ticket_action = 'delete' then
    -- Ticket comments, history, and meeting links cascade with the ticket.
    delete from public.tickets where team_id = p_team_id;
  elsif p_ticket_action = 'reset' and linked_ticket_count > 0 then
    select id into new_status_id
    from public.ticket_statuses
    where name = '신규';

    if new_status_id is null then
      raise exception '신규 티켓 상태를 찾을 수 없습니다.';
    end if;

    with reset_tickets as (
      update public.tickets
      set team_id = null,
          assignee_id = null,
          status_id = new_status_id
      where team_id = p_team_id
      returning id
    )
    insert into public.ticket_history (ticket_id, event)
    select id, '팀 삭제로 신규 미배정 큐로 이동'
    from reset_tickets;
  end if;

  update public.teams set lead_member_id = null where id = p_team_id;
  delete from public.members where team_id = p_team_id;
  delete from public.teams where id = p_team_id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'teamId', p_team_id,
    'ticketAction', p_ticket_action,
    'ticketCount', linked_ticket_count
  );
end;
$$;

-- Preserve callers using the original one-argument RPC, but fail closed if tickets
-- need a disposition. New callers pass the explicit choice to the two-argument RPC.
create or replace function public.delete_organization_team(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.delete_organization_team(p_team_id, null);
end;
$$;

revoke all on function public.delete_organization_team(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.delete_organization_team(uuid) from public, anon, authenticated, service_role;
grant execute on function public.delete_organization_team(uuid, text) to teams_runtime;
grant execute on function public.delete_organization_team(uuid) to teams_runtime;
