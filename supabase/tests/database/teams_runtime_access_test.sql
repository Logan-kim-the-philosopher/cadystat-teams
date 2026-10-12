begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

select has_role('teams_runtime', 'Teams 전용 DB 역할이 존재한다');
select ok(not (select rolbypassrls from pg_roles where rolname='teams_runtime'), 'Teams 역할은 RLS를 우회하지 않는다');
select ok(not has_table_privilege('service_role','public.teams','SELECT'), '공용 service_role은 Teams 테이블을 읽지 못한다');
select ok(not has_table_privilege('service_role','public.meeting_api_keys','UPDATE'), '공용 service_role은 Teams key를 수정하지 못한다');
select ok(has_table_privilege('teams_runtime','public.teams','SELECT'), 'Teams 역할은 조직을 읽는다');
select ok(not has_table_privilege('teams_runtime','public.teams','INSERT'), 'Teams 역할은 조직 테이블을 직접 쓰지 않는다');
select ok(has_table_privilege('teams_runtime','public.meeting_notes','UPDATE'), 'Teams 역할은 회의록 soft delete를 수행한다');
select ok(not has_table_privilege('teams_runtime','public.meeting_notes','DELETE'), 'Teams 역할은 회의록을 물리 삭제하지 않는다');
select ok(has_table_privilege('teams_runtime','public.meeting_comments','DELETE'), 'Teams 역할은 회의 댓글을 삭제한다');
select ok(has_table_privilege('teams_runtime','public.meeting_api_keys','INSERT'), 'Teams 운영자는 agent key를 발급한다');
select ok(has_function_privilege('teams_runtime','public.save_organization_team(uuid,text,uuid,jsonb)','EXECUTE'), 'Teams 역할은 조직 RPC를 실행한다');
select ok(has_function_privilege('teams_runtime','public.mutate_agent_ticket(text,text,text,text,text,jsonb)','EXECUTE'), 'Teams 역할은 agent 티켓 RPC를 실행한다');
select ok(not has_function_privilege('service_role','public.save_organization_team(uuid,text,uuid,jsonb)','EXECUTE'), '공용 service_role은 조직 RPC를 실행하지 못한다');
select ok(not has_function_privilege('anon','public.read_agent_api(text,text,text,integer,integer,text)','EXECUTE'), 'anon은 agent 조회 RPC를 실행하지 못한다');

select * from finish();
rollback;
