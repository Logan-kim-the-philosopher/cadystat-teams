create or replace function public.save_organization_team(
  p_team_id text,
  p_name text,
  p_lead_member_id text,
  p_members jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_lead_id uuid;
  item jsonb;
  v_member_id uuid;
begin
  select id into v_team_id from public.teams
  where id::text = p_team_id or plane_project_id = p_team_id
  for update;
  if v_team_id is null then raise exception '팀을 찾을 수 없습니다.'; end if;

  update public.teams set name = trim(p_name) where id = v_team_id;

  for item in select * from jsonb_array_elements(p_members) loop
    if coalesce(item->>'action', 'update') = 'delete' then
      select id into v_member_id from public.members
      where id::text = item->>'id' or plane_work_item_id = item->>'id';
      if v_member_id is not null then
        update public.tickets set assignee_id = null where assignee_id = v_member_id;
        update public.members set reports_to = null where reports_to = v_member_id;
        update public.teams set lead_member_id = null where lead_member_id = v_member_id;
        delete from public.members where id = v_member_id;
      end if;
    elsif coalesce(item->>'action', 'update') = 'create' then
      insert into public.members (name, title, gender, team_id, reports_to, sort_order, plane_work_item_id)
      values (item->>'name', item->>'title', nullif(item->>'gender',''), v_team_id, null, coalesce((item->>'sortOrder')::integer, 0), gen_random_uuid()::text);
    else
      select id into v_member_id from public.members
      where id::text = item->>'id' or plane_work_item_id = item->>'id';
      if v_member_id is null or not exists (select 1 from public.members where id = v_member_id and team_id = v_team_id) then
        raise exception '팀원을 찾을 수 없습니다.';
      end if;
      update public.members set name=item->>'name', title=item->>'title', gender=nullif(item->>'gender','') where id=v_member_id;
    end if;
  end loop;

  if nullif(p_lead_member_id, '') is null then
    v_lead_id := null;
  else
    select id into v_lead_id from public.members
    where (id::text = p_lead_member_id or plane_work_item_id = p_lead_member_id) and team_id = v_team_id;
    if v_lead_id is null then raise exception '팀장으로 지정할 구성원을 찾을 수 없습니다.'; end if;
  end if;
  update public.teams set lead_member_id = v_lead_id where id = v_team_id;
  update public.members set reports_to = case when id = v_lead_id then null else v_lead_id end where team_id = v_team_id;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.save_organization_team(text,text,text,jsonb) from public, anon;
grant execute on function public.save_organization_team(text,text,text,jsonb) to service_role;
