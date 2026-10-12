-- Example data for a fresh personal Supabase project.
-- Apply migrations first: supabase db push
-- Then run: psql "$DATABASE_URL" -f supabase/seed.example.sql

insert into public.teams (id, name, parent_team_id)
values
  ('00000000-0000-0000-0000-000000000001', '운영진', null),
  ('00000000-0000-0000-0000-000000000002', '개발팀', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', '기획팀', '00000000-0000-0000-0000-000000000001')
on conflict (id) do update set name = excluded.name, parent_team_id = excluded.parent_team_id;

insert into public.members (id, name, title, gender, team_id, sort_order)
values
  ('00000000-0000-0000-0000-000000000011', '김운영', '대표', 'male', '00000000-0000-0000-0000-000000000001', 0),
  ('00000000-0000-0000-0000-000000000012', '이개발', '개발팀장', 'male', '00000000-0000-0000-0000-000000000002', 0),
  ('00000000-0000-0000-0000-000000000013', '박기획', '기획팀장', 'female', '00000000-0000-0000-0000-000000000003', 0)
on conflict (id) do update set name = excluded.name, title = excluded.title, gender = excluded.gender, team_id = excluded.team_id;

update public.teams
set lead_member_id = case id
  when '00000000-0000-0000-0000-000000000001' then '00000000-0000-0000-0000-000000000011'::uuid
  when '00000000-0000-0000-0000-000000000002' then '00000000-0000-0000-0000-000000000012'::uuid
  when '00000000-0000-0000-0000-000000000003' then '00000000-0000-0000-0000-000000000013'::uuid
end
where id in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');

insert into public.tickets (id, ticket_number, title, summary, description, team_id, reporter, type_id, status_id, priority)
select
  '00000000-0000-0000-0000-000000000101', 'T-0001', '예시 티켓', '개인 Supabase 프로젝트에서 확인할 예시 티켓입니다.', 'seed.example.sql로 생성된 샘플 데이터입니다.',
  '00000000-0000-0000-0000-000000000002', '예시 사용자',
  (select id from public.ticket_types where name = '기능 요청' limit 1),
  (select id from public.ticket_statuses where name = '신규' limit 1), '보통'
on conflict (id) do update set title = excluded.title, summary = excluded.summary, description = excluded.description;

insert into public.meeting_notes (id, title, meeting_date, content, status)
values ('00000000-0000-0000-0000-000000000201', '예시 운영 회의', current_date, '# 회의 목적\n\n개인 환경에서 확인하기 위한 예시 회의록입니다.', 'published')
on conflict (id) do update set title = excluded.title, content = excluded.content, status = excluded.status;
