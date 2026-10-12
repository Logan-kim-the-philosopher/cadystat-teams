begin;
create extension if not exists pgtap with schema extensions;
select plan(16);
select ok((select relrowsecurity from pg_class where oid='public.meeting_api_keys'::regclass), '키 테이블 RLS');
select ok((select relrowsecurity from pg_class where oid='public.meeting_api_uploads'::regclass), '업로드 이력 RLS');
select ok(not has_table_privilege('anon', 'public.meeting_api_keys', 'SELECT'), '익명 키 조회 불가');
select ok(not has_table_privilege('authenticated', 'public.meeting_api_keys', 'INSERT'), '일반 로그인 키 생성 불가');
select ok(not has_table_privilege('anon', 'public.meeting_api_uploads', 'SELECT'), '익명 사용 기록 조회 불가');
select ok(not has_function_privilege('authenticated', 'public.create_agent_meeting(text,text,text,text,date,text,text,uuid[],jsonb)', 'EXECUTE'), '일반 로그인 업로드 RPC 불가');
select ok(has_function_privilege('teams_runtime', 'public.create_agent_meeting(text,text,text,text,date,text,text,uuid[],jsonb)', 'EXECUTE'), 'Teams 서버 업로드 RPC 허용');

insert into public.meeting_api_keys(id,name,key_hash,key_prefix,expires_at)
values ('fefefefe-0000-4000-8000-111111111111','pgTAP API key',repeat('a',64),'synthetic',now()+interval '1 day');
create temporary table first_upload as select public.create_agent_meeting(repeat('a',64),'request-1',repeat('b',64),'pgTAP 업로드','2026-09-29','# 본문','published') result;
select ok((select result->>'id' is not null and result->>'replayed'='false' from first_upload), '키 인증 후 새 회의록 생성');
select ok((select last_used_at is not null and window_count=1 from public.meeting_api_keys where id='fefefefe-0000-4000-8000-111111111111'), '사용 기록과 횟수 갱신');
select is(public.create_agent_meeting(repeat('a',64),'request-1',repeat('b',64),'pgTAP 업로드','2026-09-29','# 본문','published')->>'id', (select result->>'id' from first_upload), '재시도는 같은 회의록 반환');
select is((select count(*)::integer from public.meeting_api_uploads where api_key_id='fefefefe-0000-4000-8000-111111111111'),1,'이력 한 건만 생성');
select is(public.create_agent_meeting(repeat('a',64),'request-1',repeat('c',64),'다른 내용','2026-09-29','# 본문','published')->>'error','idempotency_conflict','같은 요청 ID 내용 충돌 거부');
select is(public.create_agent_meeting(repeat('d',64),'unknown',repeat('b',64),'제목','2026-09-29','# 본문','published')->>'error','invalid_api_key','미발급 키 거부');
update public.meeting_api_keys set expires_at=now()-interval '1 minute' where id='fefefefe-0000-4000-8000-111111111111';
select is(public.create_agent_meeting(repeat('a',64),'expired',repeat('b',64),'제목','2026-09-29','# 본문','published')->>'error','invalid_api_key','만료 키 거부');
update public.meeting_api_keys set expires_at=now()+interval '1 day',revoked_at=now() where id='fefefefe-0000-4000-8000-111111111111';
select is(public.create_agent_meeting(repeat('a',64),'revoked',repeat('b',64),'제목','2026-09-29','# 본문','published')->>'error','invalid_api_key','폐기 키 거부');
update public.meeting_api_keys set revoked_at=null,window_count=60,window_started_at=now() where id='fefefefe-0000-4000-8000-111111111111';
select is(public.create_agent_meeting(repeat('a',64),'limited',repeat('b',64),'제목','2026-09-29','# 본문','published')->>'error','rate_limited','키별 DB 요청 한도 적용');
select * from finish();
rollback;
