create table if not exists public.meeting_comments (
  id uuid primary key default gen_random_uuid(),
  meeting_slug text not null,
  author text not null default '운영자',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists meeting_comments_slug_created_idx
  on public.meeting_comments (meeting_slug, created_at desc);

alter table public.meeting_comments enable row level security;
