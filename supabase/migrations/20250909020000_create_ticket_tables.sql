create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  title text not null,
  summary text not null default '',
  description text not null default '',
  team_id uuid not null references public.teams(id) on delete restrict,
  assignee_id uuid references public.members(id) on delete set null,
  reporter text not null default '',
  type_id uuid references public.ticket_types(id) on delete set null,
  status_id uuid references public.ticket_statuses(id) on delete set null,
  priority text not null default '보통',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists tickets_team_id_idx on public.tickets(team_id);
create index if not exists tickets_status_id_idx on public.tickets(status_id);
create index if not exists ticket_comments_ticket_id_idx on public.ticket_comments(ticket_id);

insert into public.ticket_types (name) values ('버그'), ('기능 요청') on conflict (name) do nothing;
insert into public.ticket_statuses (name, sort_order) values ('신규', 0), ('담당 배정', 1), ('진행 중', 2), ('보류', 3), ('완료', 4) on conflict (name) do nothing;

create or replace function public.set_ticket_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at before update on public.tickets for each row execute function public.set_ticket_updated_at();
