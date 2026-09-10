create sequence if not exists public.ticket_number_seq start with 1000;

alter table public.tickets
  alter column ticket_number set default ('T-' || nextval('public.ticket_number_seq')::text);
