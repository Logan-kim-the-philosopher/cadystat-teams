begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

select has_function('public', 'create_ticket', array['text', 'text', 'uuid', 'uuid', 'uuid'], '티켓 생성 RPC가 존재한다');
select has_function('public', 'update_ticket', array['text', 'text', 'text', 'uuid', 'text', 'uuid', 'uuid'], '티켓 수정 RPC가 존재한다');
select has_function('public', 'delete_ticket', array['text'], '티켓 삭제 RPC가 존재한다');
select has_function('public', 'add_ticket_comment', array['text', 'text', 'text'], '티켓 댓글 RPC가 존재한다');

select ok(not has_function_privilege('anon', 'public.create_ticket(text,text,uuid,uuid,uuid)', 'EXECUTE'), 'anon은 티켓 생성 RPC를 실행할 수 없다');
select ok(has_function_privilege('teams_runtime', 'public.create_ticket(text,text,uuid,uuid,uuid)', 'EXECUTE'), 'teams_runtime은 티켓 생성 RPC를 실행할 수 있다');
select ok(not has_function_privilege('anon', 'public.update_ticket(text,text,text,uuid,text,uuid,uuid)', 'EXECUTE'), 'anon은 티켓 수정 RPC를 실행할 수 없다');
select ok(has_function_privilege('teams_runtime', 'public.update_ticket(text,text,text,uuid,text,uuid,uuid)', 'EXECUTE'), 'teams_runtime은 티켓 수정 RPC를 실행할 수 있다');
select ok(not has_function_privilege('anon', 'public.delete_ticket(text)', 'EXECUTE'), 'anon은 티켓 삭제 RPC를 실행할 수 없다');
select ok(has_function_privilege('teams_runtime', 'public.delete_ticket(text)', 'EXECUTE'), 'teams_runtime은 티켓 삭제 RPC를 실행할 수 있다');
select ok(not has_function_privilege('anon', 'public.add_ticket_comment(text,text,text)', 'EXECUTE'), 'anon은 댓글 RPC를 실행할 수 없다');
select ok(has_function_privilege('teams_runtime', 'public.add_ticket_comment(text,text,text)', 'EXECUTE'), 'teams_runtime은 댓글 RPC를 실행할 수 있다');

select lives_ok(
  $$ select public.create_ticket('pgTAP 신규 티켓', '상태 전이 통합 검증', (select id from public.ticket_types where name = '버그'), null, null) $$,
  '미배정 신규 티켓을 생성할 수 있다'
);
select is((select s.name from public.tickets t join public.ticket_statuses s on s.id = t.status_id where t.title = 'pgTAP 신규 티켓'), '신규', '미배정 티켓은 신규 상태다');
select ok((select count(*) = 1 from public.ticket_history h join public.tickets t on t.id = h.ticket_id where t.title = 'pgTAP 신규 티켓' and h.event = '접수됨'), '생성 시 접수 이력이 남는다');

select throws_ok(
  $$ select public.update_ticket((select ticket_number from public.tickets where title = 'pgTAP 신규 티켓'), 'pgTAP 신규 티켓', '상태 전이 통합 검증', (select id from public.ticket_types where name = '버그'), '완료', null, null) $$,
  'P0001',
  '신규 티켓은 배정 후 완료할 수 있습니다.',
  '신규 티켓은 배정 없이 완료할 수 없다'
);
select throws_ok(
  $$ select public.update_ticket((select ticket_number from public.tickets where title = 'pgTAP 신규 티켓'), 'pgTAP 신규 티켓', '상태 전이 통합 검증', (select id from public.ticket_types where name = '버그'), '배정', null, null) $$,
  'P0001',
  '배정 또는 완료 상태에는 담당 팀이 필요합니다.',
  '배정 상태에는 담당 팀이 필요하다'
);

select lives_ok(
  $$ select public.update_ticket((select ticket_number from public.tickets where title = 'pgTAP 신규 티켓'), 'pgTAP 신규 티켓', '상태 전이 통합 검증', (select id from public.ticket_types where name = '버그'), '배정', '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000013'::uuid) $$,
  '팀과 담당자를 지정해 신규 티켓을 배정할 수 있다'
);
select ok((select s.name = '배정' and t.team_id = '00000000-0000-0000-0000-000000000002'::uuid from public.tickets t join public.ticket_statuses s on s.id = t.status_id where t.title = 'pgTAP 신규 티켓'), '배정 상태와 담당 팀이 함께 저장된다');
select ok((select count(*) = 1 from public.ticket_history h join public.tickets t on t.id = h.ticket_id where t.title = 'pgTAP 신규 티켓' and h.event = '개발팀에 배정됨'), '팀 배정 이력이 남는다');

select lives_ok(
  $$ select public.update_ticket((select ticket_number from public.tickets where title = 'pgTAP 신규 티켓'), 'pgTAP 신규 티켓', '상태 전이 통합 검증', (select id from public.ticket_types where name = '버그'), '완료', '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000013'::uuid) $$,
  '배정 티켓을 완료할 수 있다'
);
select is((select s.name from public.tickets t join public.ticket_statuses s on s.id = t.status_id where t.title = 'pgTAP 신규 티켓'), '완료', '완료 상태가 저장된다');

select lives_ok(
  $$ select public.add_ticket_comment((select ticket_number from public.tickets where title = 'pgTAP 신규 티켓'), 'pgTAP 운영자', '통합 댓글') $$,
  '티켓 댓글을 추가할 수 있다'
);
select ok((select count(*) = 1 from public.ticket_comments c join public.tickets t on t.id = c.ticket_id where t.title = 'pgTAP 신규 티켓' and c.body = '통합 댓글'), '댓글이 티켓에 연결된다');

select lives_ok(
  $$ select public.delete_ticket((select ticket_number from public.tickets where title = 'pgTAP 신규 티켓')) $$,
  '티켓을 삭제할 수 있다'
);
select ok((select count(*) = 0 from public.tickets where title = 'pgTAP 신규 티켓'), '삭제한 티켓이 남지 않는다');
select ok((select count(*) = 0 from public.ticket_comments where author = 'pgTAP 운영자'), '티켓 삭제 시 댓글도 제거된다');

select * from finish();
rollback;
