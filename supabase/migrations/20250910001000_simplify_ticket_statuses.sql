insert into public.ticket_statuses (name, sort_order)
values ('배정', 1)
on conflict (name) do update set sort_order = excluded.sort_order;

update public.tickets
set status_id = assigned.id
from public.ticket_statuses current_status
cross join public.ticket_statuses assigned
where public.tickets.status_id = current_status.id
  and assigned.name = '배정'
  and current_status.name in ('담당 배정', '진행 중', '보류');

update public.ticket_statuses
set sort_order = case name
  when '신규' then 0
  when '배정' then 1
  when '완료' then 2
end
where name in ('신규', '배정', '완료');

delete from public.ticket_statuses
where name not in ('신규', '배정', '완료');
