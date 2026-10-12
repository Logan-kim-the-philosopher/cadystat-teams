create or replace function public.create_ticket(
  p_title text,
  p_description text,
  p_type_id uuid,
  p_team_id uuid default null,
  p_assignee_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket_id uuid;
  new_ticket_number text;
  initial_status_id uuid;
  team_name text;
begin
  if p_title is null or pg_catalog.btrim(p_title) = '' then
    raise exception '티켓 제목은 필수입니다.';
  end if;
  if pg_catalog.length(pg_catalog.btrim(p_title)) > 160 then
    raise exception '티켓 제목은 160자 이하여야 합니다.';
  end if;
  if p_description is null or pg_catalog.btrim(p_description) = '' then
    raise exception '티켓 설명은 필수입니다.';
  end if;
  if pg_catalog.length(pg_catalog.btrim(p_description)) > 5000 then
    raise exception '티켓 설명은 5000자 이하여야 합니다.';
  end if;
  if not exists (select 1 from public.ticket_types where id = p_type_id) then
    raise exception '티켓 유형을 찾을 수 없습니다.';
  end if;

  if p_team_id is not null then
    select name into team_name from public.teams where id = p_team_id;
    if team_name is null then
      raise exception '담당 팀을 찾을 수 없습니다.';
    end if;
  end if;

  if p_assignee_id is not null and (
    p_team_id is null or not exists (
      select 1 from public.members where id = p_assignee_id and team_id = p_team_id
    )
  ) then
    raise exception '담당자는 담당 팀 소속이어야 합니다.';
  end if;

  select id into initial_status_id
  from public.ticket_statuses
  where name = case when p_team_id is null then '신규' else '배정' end;

  insert into public.tickets as created_ticket (title, description, team_id, assignee_id, type_id, status_id)
  values (
    pg_catalog.btrim(p_title),
    pg_catalog.btrim(p_description),
    p_team_id,
    p_assignee_id,
    p_type_id,
    initial_status_id
  )
  returning created_ticket.id, created_ticket.ticket_number into ticket_id, new_ticket_number;

  insert into public.ticket_history (ticket_id, event)
  values (ticket_id, '접수됨');

  if p_team_id is not null then
    insert into public.ticket_history (ticket_id, event)
    values (ticket_id, team_name || '에 배정됨');
  end if;

  return pg_catalog.jsonb_build_object('ok', true, 'ticketId', ticket_id, 'ticketNumber', new_ticket_number);
end;
$$;

create or replace function public.update_ticket(
  p_ticket_number text,
  p_title text,
  p_description text,
  p_type_id uuid,
  p_status text,
  p_team_id uuid default null,
  p_assignee_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket_id uuid;
  old_title text;
  old_description text;
  old_type_id uuid;
  old_team_id uuid;
  old_assignee_id uuid;
  old_status text;
  next_status_id uuid;
  team_name text;
  assignee_name text;
begin
  select t.id, t.title, t.description, t.type_id, t.team_id, t.assignee_id, s.name
  into ticket_id, old_title, old_description, old_type_id, old_team_id, old_assignee_id, old_status
  from public.tickets t
  join public.ticket_statuses s on s.id = t.status_id
  where t.ticket_number = p_ticket_number
  for update of t;

  if ticket_id is null then
    raise exception '티켓을 찾을 수 없습니다.';
  end if;
  if p_title is null or pg_catalog.btrim(p_title) = '' then
    raise exception '티켓 제목은 필수입니다.';
  end if;
  if pg_catalog.length(pg_catalog.btrim(p_title)) > 160 then
    raise exception '티켓 제목은 160자 이하여야 합니다.';
  end if;
  if p_description is null or pg_catalog.btrim(p_description) = '' then
    raise exception '티켓 설명은 필수입니다.';
  end if;
  if pg_catalog.length(pg_catalog.btrim(p_description)) > 5000 then
    raise exception '티켓 설명은 5000자 이하여야 합니다.';
  end if;
  if not exists (select 1 from public.ticket_types where id = p_type_id) then
    raise exception '티켓 유형을 찾을 수 없습니다.';
  end if;
  if p_status not in ('신규', '배정', '완료') then
    raise exception '유효하지 않은 티켓 상태입니다.';
  end if;
  if old_status = '신규' and p_status = '완료' then
    raise exception '신규 티켓은 배정 후 완료할 수 있습니다.';
  end if;
  if old_status = '완료' and p_status = '신규' then
    raise exception '완료 티켓은 배정 상태로 다시 열 수 있습니다.';
  end if;
  if p_status = '신규' and (p_team_id is not null or p_assignee_id is not null) then
    raise exception '신규 상태에서는 담당 팀과 담당자를 지정할 수 없습니다.';
  end if;
  if p_status in ('배정', '완료') and p_team_id is null then
    raise exception '배정 또는 완료 상태에는 담당 팀이 필요합니다.';
  end if;

  if p_team_id is not null then
    select name into team_name from public.teams where id = p_team_id;
    if team_name is null then
      raise exception '담당 팀을 찾을 수 없습니다.';
    end if;
  end if;

  if p_assignee_id is not null then
    select name into assignee_name
    from public.members
    where id = p_assignee_id and team_id = p_team_id;
    if assignee_name is null then
      raise exception '담당자는 담당 팀 소속이어야 합니다.';
    end if;
  end if;

  select id into next_status_id from public.ticket_statuses where name = p_status;

  update public.tickets
  set
    title = pg_catalog.btrim(p_title),
    description = pg_catalog.btrim(p_description),
    type_id = p_type_id,
    team_id = p_team_id,
    assignee_id = p_assignee_id,
    status_id = next_status_id
  where id = ticket_id;

  if old_title is distinct from pg_catalog.btrim(p_title) then
    insert into public.ticket_history (ticket_id, event) values (ticket_id, '제목 변경');
  end if;
  if old_description is distinct from pg_catalog.btrim(p_description) then
    insert into public.ticket_history (ticket_id, event) values (ticket_id, '설명 변경');
  end if;
  if old_type_id is distinct from p_type_id then
    insert into public.ticket_history (ticket_id, event) values (ticket_id, '유형 변경');
  end if;
  if old_team_id is distinct from p_team_id then
    insert into public.ticket_history (ticket_id, event)
    values (
      ticket_id,
      case when p_team_id is null then '미배정 큐로 이동' else team_name || '에 배정됨' end
    );
  end if;
  if old_assignee_id is distinct from p_assignee_id then
    insert into public.ticket_history (ticket_id, event)
    values (
      ticket_id,
      case when p_assignee_id is null then '담당자 해제' else '담당자 지정: ' || assignee_name end
    );
  end if;
  if old_status is distinct from p_status then
    insert into public.ticket_history (ticket_id, event)
    values (ticket_id, '상태 변경: ' || old_status || ' → ' || p_status);
  end if;

  return pg_catalog.jsonb_build_object('ok', true, 'ticketId', ticket_id, 'ticketNumber', p_ticket_number);
end;
$$;

create or replace function public.delete_ticket(p_ticket_number text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket_id uuid;
begin
  select id into ticket_id
  from public.tickets
  where ticket_number = p_ticket_number
  for update;

  if ticket_id is null then
    raise exception '티켓을 찾을 수 없습니다.';
  end if;

  delete from public.tickets where id = ticket_id;
  return pg_catalog.jsonb_build_object('ok', true, 'ticketId', ticket_id, 'ticketNumber', p_ticket_number);
end;
$$;

create or replace function public.add_ticket_comment(
  p_ticket_number text,
  p_author text,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket_id uuid;
  comment_id uuid;
begin
  select id into ticket_id from public.tickets where ticket_number = p_ticket_number;
  if ticket_id is null then
    raise exception '티켓을 찾을 수 없습니다.';
  end if;
  if p_author is null or pg_catalog.btrim(p_author) = '' then
    raise exception '댓글 작성자는 필수입니다.';
  end if;
  if pg_catalog.length(pg_catalog.btrim(p_author)) > 80 then
    raise exception '댓글 작성자는 80자 이하여야 합니다.';
  end if;
  if p_body is null or pg_catalog.btrim(p_body) = '' then
    raise exception '댓글 내용은 필수입니다.';
  end if;
  if pg_catalog.length(pg_catalog.btrim(p_body)) > 2000 then
    raise exception '댓글은 2000자 이하여야 합니다.';
  end if;

  insert into public.ticket_comments (ticket_id, author, body)
  values (ticket_id, pg_catalog.btrim(p_author), pg_catalog.btrim(p_body))
  returning id into comment_id;

  return pg_catalog.jsonb_build_object('ok', true, 'ticketId', ticket_id, 'commentId', comment_id);
end;
$$;

revoke all on function public.create_ticket(text, text, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_ticket(text, text, text, uuid, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.delete_ticket(text) from public, anon, authenticated;
revoke all on function public.add_ticket_comment(text, text, text) from public, anon, authenticated;
grant execute on function public.create_ticket(text, text, uuid, uuid, uuid) to service_role;
grant execute on function public.update_ticket(text, text, text, uuid, text, uuid, uuid) to service_role;
grant execute on function public.delete_ticket(text) to service_role;
grant execute on function public.add_ticket_comment(text, text, text) to service_role;
