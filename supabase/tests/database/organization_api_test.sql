begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select has_function('public', 'create_organization_team', array['text', 'uuid', 'text', 'text', 'text'], '팀 생성 RPC가 존재한다');
select has_function('public', 'delete_organization_team', array['uuid', 'text'], '티켓 처리 방식을 받는 팀 삭제 RPC가 존재한다');
select ok(not has_function_privilege('anon', 'public.create_organization_team(text,uuid,text,text,text)', 'EXECUTE'), 'anon은 팀 생성 RPC를 실행할 수 없다');
select ok(has_function_privilege('teams_runtime', 'public.create_organization_team(text,uuid,text,text,text)', 'EXECUTE'), 'teams_runtime은 팀 생성 RPC를 실행할 수 있다');

select lives_ok(
  $$ select public.create_organization_team('통합 테스트 팀', '00000000-0000-0000-0000-000000000001'::uuid, '통합 테스트 리드', 'Lead', null) $$,
  '팀과 선택적 리드를 한 트랜잭션에서 생성할 수 있다'
);
select ok((select count(*) = 1 from public.teams where name = '통합 테스트 팀'), '생성된 팀이 존재한다');
select ok((select count(*) = 1 from public.members where name = '통합 테스트 리드'), '생성된 리드가 존재한다');
select ok((select lead_member_id is not null from public.teams where name = '통합 테스트 팀'), '생성된 팀에 리드가 연결된다');

select lives_ok(
  $$ select public.delete_organization_team((select id from public.teams where name = '통합 테스트 팀')) $$,
  '하위 팀이 없는 팀을 한 트랜잭션에서 삭제할 수 있다'
);
select ok((select count(*) = 0 from public.teams where name = '통합 테스트 팀'), '삭제된 팀이 남지 않는다');

select * from finish();
rollback;
