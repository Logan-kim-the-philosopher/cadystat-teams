create table if not exists public.ticket_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  event text not null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_history_ticket_id_idx on public.ticket_history(ticket_id, created_at);
