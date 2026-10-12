create sequence public.ticket_number_seq start with 1000;

create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (btrim(name) <> ''),
  created_at timestamptz not null default now()
);

create table public.ticket_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('신규', '배정', '완료')),
  sort_order integer not null unique check (sort_order between 0 and 2),
  created_at timestamptz not null default now()
);

insert into public.ticket_types (name)
values ('버그'), ('기능 요청');

insert into public.ticket_statuses (name, sort_order)
values ('신규', 0), ('배정', 1), ('완료', 2);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default ('T-' || nextval('public.ticket_number_seq')::text),
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  team_id uuid references public.teams(id) on delete set null,
  assignee_id uuid references public.members(id) on delete set null,
  type_id uuid not null references public.ticket_types(id) on delete restrict,
  status_id uuid not null references public.ticket_statuses(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence public.ticket_number_seq owned by public.tickets.ticket_number;

create table public.ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author text not null default '운영자' check (btrim(author) <> ''),
  body text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now()
);

create table public.ticket_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  event text not null check (btrim(event) <> ''),
  created_at timestamptz not null default now()
);

create index tickets_team_id_idx on public.tickets(team_id);
create index tickets_assignee_id_idx on public.tickets(assignee_id);
create index tickets_status_id_created_at_idx on public.tickets(status_id, created_at desc);
create index ticket_comments_ticket_id_created_at_idx on public.ticket_comments(ticket_id, created_at desc);
create index ticket_history_ticket_id_created_at_idx on public.ticket_history(ticket_id, created_at desc);

create trigger tickets_set_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

alter table public.ticket_types enable row level security;
alter table public.ticket_statuses enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_comments enable row level security;
alter table public.ticket_history enable row level security;

revoke all on table public.ticket_types, public.ticket_statuses, public.tickets, public.ticket_comments, public.ticket_history from anon, authenticated;
grant all on table public.ticket_types, public.ticket_statuses, public.tickets, public.ticket_comments, public.ticket_history to service_role;
revoke all on sequence public.ticket_number_seq from anon, authenticated;
grant usage, select on sequence public.ticket_number_seq to service_role;
