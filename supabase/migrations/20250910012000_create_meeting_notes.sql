create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  meeting_date date not null,
  content text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived'))
);

alter table public.meeting_comments
  add column if not exists meeting_note_id uuid references public.meeting_notes(id) on delete cascade;

create index if not exists meeting_comments_note_id_created_idx
  on public.meeting_comments (meeting_note_id, created_at desc);

alter table public.meeting_notes enable row level security;
