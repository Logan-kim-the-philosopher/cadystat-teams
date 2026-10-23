-- Editing names or titles must preserve existing reporting hierarchies.
create or replace function public.save_organization_team(
  p_team_id uuid,
  p_name text,
  p_lead_member_id uuid default null,
  p_members jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  member_action text;
  member_id uuid;
  lead_id uuid;
  previous_lead_id uuid;
begin
  if p_name is null or pg_catalog.btrim(p_name) = '' then
    raise exception '팀 이름은 필수입니다.';
  end if;

  if pg_catalog.jsonb_typeof(p_members) <> 'array' then
    raise exception '구성원 목록은 배열이어야 합니다.';
  end if;

  select lead_member_id into previous_lead_id from public.teams where id = p_team_id for update;
  if not found then
    raise exception '팀을 찾을 수 없습니다.';
  end if;

  update public.teams
  set name = pg_catalog.btrim(p_name)
  where id = p_team_id;

  for item in select value from pg_catalog.jsonb_array_elements(p_members)
  loop
    member_action := coalesce(item->>'action', 'update');
    member_id := nullif(item->>'id', '')::uuid;

    if member_action = 'delete' then
      if member_id is null or not exists (
        select 1 from public.members where id = member_id and team_id = p_team_id
      ) then
        raise exception '삭제할 팀원을 찾을 수 없습니다.';
      end if;

      delete from public.members where id = member_id and team_id = p_team_id;
    elsif member_action = 'create' then
      insert into public.members (id, name, title, gender, team_id, sort_order)
      values (
        coalesce(member_id, extensions.gen_random_uuid()),
        pg_catalog.btrim(item->>'name'),
        coalesce(item->>'title', ''),
        nullif(item->>'gender', ''),
        p_team_id,
        coalesce((item->>'sortOrder')::integer, 0)
      );
    elsif member_action = 'update' then
      update public.members
      set
        name = pg_catalog.btrim(item->>'name'),
        title = coalesce(item->>'title', ''),
        gender = nullif(item->>'gender', ''),
        sort_order = coalesce((item->>'sortOrder')::integer, sort_order)
      where id = member_id and team_id = p_team_id;

      if not found then
        raise exception '수정할 팀원을 찾을 수 없습니다.';
      end if;
    else
      raise exception '지원하지 않는 구성원 작업입니다: %', member_action;
    end if;
  end loop;

  if p_lead_member_id is not null then
    select id into lead_id
    from public.members
    where id = p_lead_member_id and team_id = p_team_id;

    if lead_id is null then
      raise exception '팀장으로 지정할 구성원을 찾을 수 없습니다.';
    end if;
  end if;

  update public.teams set lead_member_id = lead_id where id = p_team_id;
  update public.members
  set reports_to = case when id = lead_id then null else lead_id end
  where team_id = p_team_id
    and (previous_lead_id is distinct from lead_id or id = lead_id or reports_to is null);

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'teamId', p_team_id,
    'leadMemberId', lead_id
  );
end;
$$;

revoke all on function public.save_organization_team(uuid, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_organization_team(uuid, text, uuid, jsonb) to service_role;
