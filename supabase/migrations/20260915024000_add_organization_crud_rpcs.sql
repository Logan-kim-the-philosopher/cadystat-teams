create or replace function public.create_organization_team(
  p_name text,
  p_parent_team_id uuid default null,
  p_lead_name text default null,
  p_lead_title text default null,
  p_lead_gender text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_id uuid;
  lead_id uuid;
begin
  if p_name is null or pg_catalog.btrim(p_name) = '' then
    raise exception '팀 이름은 필수입니다.';
  end if;

  if pg_catalog.length(pg_catalog.btrim(p_name)) > 80 then
    raise exception '팀 이름은 80자 이하여야 합니다.';
  end if;

  if p_parent_team_id is not null and not exists (
    select 1 from public.teams where id = p_parent_team_id
  ) then
    raise exception '상위 팀을 찾을 수 없습니다.';
  end if;

  if nullif(pg_catalog.btrim(coalesce(p_lead_name, '')), '') is not null
    and nullif(pg_catalog.btrim(coalesce(p_lead_title, '')), '') is null then
    raise exception '팀장 직책은 필수입니다.';
  end if;

  if p_lead_gender is not null and p_lead_gender not in ('male', 'female') then
    raise exception '유효하지 않은 성별 값입니다.';
  end if;

  insert into public.teams (name, parent_team_id)
  values (pg_catalog.btrim(p_name), p_parent_team_id)
  returning id into team_id;

  if nullif(pg_catalog.btrim(coalesce(p_lead_name, '')), '') is not null then
    insert into public.members (name, title, gender, team_id, sort_order)
    values (
      pg_catalog.btrim(p_lead_name),
      pg_catalog.btrim(p_lead_title),
      p_lead_gender,
      team_id,
      0
    )
    returning id into lead_id;

    update public.teams set lead_member_id = lead_id where id = team_id;
  end if;

  return pg_catalog.jsonb_build_object('ok', true, 'teamId', team_id, 'leadMemberId', lead_id);
end;
$$;

create or replace function public.delete_organization_team(p_team_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.teams where id = p_team_id for update;
  if not found then
    raise exception '팀을 찾을 수 없습니다.';
  end if;

  if exists (select 1 from public.teams where parent_team_id = p_team_id) then
    raise exception '하위 팀이 있는 팀은 삭제할 수 없습니다.';
  end if;

  update public.tickets
  set team_id = null, assignee_id = null
  where team_id = p_team_id;

  update public.teams set lead_member_id = null where id = p_team_id;
  delete from public.members where team_id = p_team_id;
  delete from public.teams where id = p_team_id;

  return pg_catalog.jsonb_build_object('ok', true, 'teamId', p_team_id);
end;
$$;

revoke all on function public.create_organization_team(text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.delete_organization_team(uuid) from public, anon, authenticated;
grant execute on function public.create_organization_team(text, uuid, text, text, text) to service_role;
grant execute on function public.delete_organization_team(uuid) to service_role;
