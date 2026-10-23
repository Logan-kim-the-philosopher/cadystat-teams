create table public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  meeting_date date not null,
  content text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meeting_comments (
  id uuid primary key default gen_random_uuid(),
  meeting_note_id uuid not null references public.meeting_notes(id) on delete cascade,
  author text not null default '운영자' check (btrim(author) <> ''),
  body text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now()
);

create table public.meeting_note_tickets (
  meeting_note_id uuid not null references public.meeting_notes(id) on delete cascade,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meeting_note_id, ticket_id)
);

create index meeting_notes_date_idx on public.meeting_notes(meeting_date desc);
create index meeting_comments_note_id_created_at_idx on public.meeting_comments(meeting_note_id, created_at desc);
create index meeting_note_tickets_ticket_id_idx on public.meeting_note_tickets(ticket_id);

create trigger meeting_notes_set_updated_at
before update on public.meeting_notes
for each row execute function public.set_updated_at();

alter table public.meeting_notes enable row level security;
alter table public.meeting_comments enable row level security;
alter table public.meeting_note_tickets enable row level security;

revoke all on table public.meeting_notes, public.meeting_comments, public.meeting_note_tickets from anon, authenticated;
grant all on table public.meeting_notes, public.meeting_comments, public.meeting_note_tickets to service_role;
