create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (btrim(name) <> ''),
  parent_team_id uuid references public.teams(id) on delete restrict,
  lead_member_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_parent_not_self check (parent_team_id is null or parent_team_id <> id)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  title text not null default '',
  gender text check (gender in ('male', 'female') or gender is null),
  team_id uuid not null references public.teams(id) on delete restrict,
  reports_to uuid references public.members(id) on delete set null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint members_reports_to_not_self check (reports_to is null or reports_to <> id)
);

alter table public.teams
  add constraint teams_lead_member_fk
  foreign key (lead_member_id) references public.members(id) on delete set null;

create index teams_parent_team_id_idx on public.teams(parent_team_id);
create index members_team_id_sort_order_idx on public.members(team_id, sort_order);
create index members_reports_to_idx on public.members(reports_to);

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

alter table public.teams enable row level security;
alter table public.members enable row level security;

revoke all on table public.teams, public.members from anon, authenticated;
grant all on table public.teams, public.members to service_role;
