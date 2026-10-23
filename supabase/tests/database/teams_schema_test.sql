begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

select has_table('public', 'teams', 'teams 테이블이 존재한다');
select has_table('public', 'members', 'members 테이블이 존재한다');
select has_table('public', 'ticket_types', 'ticket_types 테이블이 존재한다');
select has_table('public', 'ticket_statuses', 'ticket_statuses 테이블이 존재한다');
select has_table('public', 'tickets', 'tickets 테이블이 존재한다');
select has_table('public', 'ticket_comments', 'ticket_comments 테이블이 존재한다');
select has_table('public', 'ticket_history', 'ticket_history 테이블이 존재한다');
select has_table('public', 'meeting_notes', 'meeting_notes 테이블이 존재한다');
select has_table('public', 'meeting_comments', 'meeting_comments 테이블이 존재한다');
select has_table('public', 'meeting_note_tickets', 'meeting_note_tickets 테이블이 존재한다');

select col_is_fk('public', 'meeting_comments', 'meeting_note_id', '회의 댓글은 UUID 회의록 FK를 사용한다');
select col_is_fk('public', 'meeting_note_tickets', 'meeting_note_id', '회의-티켓 연결은 회의록 FK를 사용한다');
select col_is_fk('public', 'meeting_note_tickets', 'ticket_id', '회의-티켓 연결은 티켓 FK를 사용한다');
select hasnt_column('public', 'meeting_comments', 'meeting_slug', '회의 댓글에 legacy slug 열이 없다');
select hasnt_column('public', 'meeting_note_tickets', 'meeting_slug', '회의-티켓 연결에 legacy slug 열이 없다');

select is((select array_agg(name order by sort_order) from public.ticket_statuses), array['신규', '배정', '완료']::text[], '티켓 상태는 세 가지 정본 값만 가진다');

select ok(
  (
    select bool_and(c.relrowsecurity)
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any(array['teams', 'members', 'ticket_types', 'ticket_statuses', 'tickets', 'ticket_comments', 'ticket_history', 'meeting_notes', 'meeting_comments', 'meeting_note_tickets'])
  ),
  'Teams MVP의 모든 테이블은 RLS가 활성화되어 있다'
);

select ok((select count(*) = 4 from public.teams), '합성 팀 seed 네 건이 적용된다');
select ok((select count(*) = 4 from public.tickets), '합성 티켓 seed 네 건이 적용된다');
select ok((select count(*) = 2 from public.meeting_notes), '합성 회의록 seed 두 건이 적용된다');

select has_function('public', 'save_organization_team', array['uuid', 'text', 'uuid', 'jsonb'], '조직 저장 RPC가 존재한다');
select ok(not has_function_privilege('anon', 'public.save_organization_team(uuid,text,uuid,jsonb)', 'EXECUTE'), 'anon은 조직 저장 RPC를 실행할 수 없다');
select ok(has_function_privilege('teams_runtime', 'public.save_organization_team(uuid,text,uuid,jsonb)', 'EXECUTE'), 'teams_runtime만 조직 저장 RPC를 실행할 수 있다');
select lives_ok(
  $$ select public.save_organization_team('00000000-0000-0000-0000-000000000002'::uuid, '개발팀', '00000000-0000-0000-0000-000000000012'::uuid, '[]'::jsonb) $$,
  '합성 조직을 RPC로 저장할 수 있다'
);
select lives_ok(
  $$ select public.save_organization_team(
    '00000000-0000-0000-0000-000000000002'::uuid,
    '개발팀',
    '00000000-0000-0000-0000-000000000012'::uuid,
    '[{"action":"create","name":"샘플 새 구성원","title":"Developer","sortOrder":3}]'::jsonb
  ) $$,
  '조직 RPC로 UUID를 자동 생성해 구성원을 추가할 수 있다'
);
select ok(
  (select count(*) = 1 from public.members where name = '샘플 새 구성원' and team_id = '00000000-0000-0000-0000-000000000002'::uuid),
  '조직 RPC가 추가한 구성원을 같은 팀에 연결한다'
);

select * from finish();
rollback;
