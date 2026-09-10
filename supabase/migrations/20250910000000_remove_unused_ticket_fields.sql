alter table public.tickets
  drop column if exists priority,
  drop column if exists reporter,
  drop column if exists summary;
