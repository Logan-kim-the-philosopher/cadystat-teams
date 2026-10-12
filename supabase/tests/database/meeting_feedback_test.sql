begin;
create extension if not exists pgtap with schema extensions;
select plan(8);
select ok((select relrowsecurity from pg_class where oid='public.meeting_api_mutations'::regclass), '수정 이력 RLS');
select ok(not has_table_privilege('anon','public.meeting_api_mutations','SELECT'), '익명 수정 이력 조회 거부');
select ok(not has_function_privilege('authenticated','public.mutate_agent_meeting(text,text,text,uuid,text,jsonb)','EXECUTE'), '일반 사용자 수정 RPC 직접 호출 거부');
select ok(has_function_privilege('teams_runtime','public.mutate_agent_meeting(text,text,text,uuid,text,jsonb)','EXECUTE'), 'Teams 서버 수정 RPC 허용');
select ok(not has_function_privilege('anon','public.save_meeting_with_tickets(text,date,text,text,uuid[],uuid,jsonb)','EXECUTE'), '익명 회의 티켓 RPC 거부');
create temporary table hierarchy_team as select public.create_organization_team('계층 검증',null,'리드','Lead','male') result;
insert into public.members(id,name,title,team_id,reports_to) values
('eeeeeeee-0000-4000-8000-000000000001','매니저','Manager',(select (result->>'teamId')::uuid from hierarchy_team),(select (result->>'leadMemberId')::uuid from hierarchy_team)),
('eeeeeeee-0000-4000-8000-000000000002','담당자','Developer',(select (result->>'teamId')::uuid from hierarchy_team),'eeeeeeee-0000-4000-8000-000000000001');
select lives_ok($$select public.save_organization_team((select (result->>'teamId')::uuid from hierarchy_team),'계층 검증 수정',(select (result->>'leadMemberId')::uuid from hierarchy_team),'[]')$$,'팀 이름 변경');
select is((select reports_to::text from public.members where id='eeeeeeee-0000-4000-8000-000000000002'),'eeeeeeee-0000-4000-8000-000000000001','이름 변경이 사람 간 계층을 평탄화하지 않음');
select lives_ok($$select public.delete_organization_team((select (result->>'teamId')::uuid from hierarchy_team))$$,'계층 팀 정리');
select * from finish();
rollback;
