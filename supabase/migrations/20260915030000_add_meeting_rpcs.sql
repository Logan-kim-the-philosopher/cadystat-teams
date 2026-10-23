create or replace function public.save_meeting_note(
  p_title text, p_meeting_date date, p_content text, p_status text,
  p_ticket_ids uuid[] default '{}', p_meeting_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare note_id uuid;
begin
  if p_title is null or btrim(p_title) = '' or length(btrim(p_title)) > 160 then
    raise exception '회의 제목은 1~160자여야 합니다.';
  end if;
  if p_meeting_date is null or p_content is null or length(p_content) > 50000 then
    raise exception '회의 날짜와 50000자 이하 본문이 필요합니다.';
  end if;
  if p_status is null or p_status not in ('draft', 'published', 'archived') then
    raise exception '유효하지 않은 회의 상태입니다.';
  end if;
  if cardinality(p_ticket_ids) > 100 or exists (
    select 1 from unnest(p_ticket_ids) x where not exists (select 1 from public.tickets where id = x)
  ) then raise exception '연결 티켓을 찾을 수 없습니다.'; end if;
  if p_meeting_id is null then
    insert into public.meeting_notes(title, meeting_date, content, status)
    values (btrim(p_title), p_meeting_date, p_content, p_status) returning id into note_id;
  else
    update public.meeting_notes set title = btrim(p_title), meeting_date = p_meeting_date,
      content = p_content, status = p_status where id = p_meeting_id returning id into note_id;
    if note_id is null then raise exception '회의록을 찾을 수 없습니다.'; end if;
  end if;
  delete from public.meeting_note_tickets where meeting_note_id = note_id;
  insert into public.meeting_note_tickets(meeting_note_id, ticket_id)
  select note_id, x from (select distinct unnest(p_ticket_ids) x) ids;
  return note_id;
end;
$$;

create or replace function public.add_meeting_comment(p_meeting_id uuid, p_body text, p_author text default '내부 사용자')
returns uuid language plpgsql security definer set search_path = '' as $$
declare comment_id uuid;
begin
  if not exists (select 1 from public.meeting_notes where id = p_meeting_id) then
    raise exception '회의록을 찾을 수 없습니다.';
  end if;
  if p_body is null or btrim(p_body) = '' or length(btrim(p_body)) > 2000 then
    raise exception '댓글은 1~2000자여야 합니다.';
  end if;
  if p_author is null or btrim(p_author) = '' or length(btrim(p_author)) > 80 then
    raise exception '작성자는 1~80자여야 합니다.';
  end if;
  insert into public.meeting_comments(meeting_note_id, body, author)
  values (p_meeting_id, btrim(p_body), btrim(p_author)) returning id into comment_id;
  return comment_id;
end;
$$;
revoke all on function public.save_meeting_note(text,date,text,text,uuid[],uuid) from public, anon, authenticated;
revoke all on function public.add_meeting_comment(uuid,text,text) from public, anon, authenticated;
grant execute on function public.save_meeting_note(text,date,text,text,uuid[],uuid) to service_role;
grant execute on function public.add_meeting_comment(uuid,text,text) to service_role;
