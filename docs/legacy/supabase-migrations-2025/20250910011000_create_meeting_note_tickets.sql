create table if not exists public.meeting_note_tickets (
  meeting_slug text not null,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  primary key (meeting_slug, ticket_id)
);

create index if not exists meeting_note_tickets_ticket_id_idx
  on public.meeting_note_tickets (ticket_id);

alter table public.meeting_note_tickets enable row level security;
