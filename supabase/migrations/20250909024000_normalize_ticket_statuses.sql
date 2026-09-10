insert into public.ticket_statuses (name, sort_order) values ('배정', 1) on conflict (name) do nothing;

update public.tickets
set status_id = (select id from public.ticket_statuses where name = '배정')
where status_id in (select id from public.ticket_statuses where name in ('담당 배정', '진행 중', '보류'));

delete from public.ticket_statuses where name in ('담당 배정', '진행 중', '보류');
