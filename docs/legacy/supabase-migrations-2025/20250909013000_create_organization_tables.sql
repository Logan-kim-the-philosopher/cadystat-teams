create extension if not exists pgcrypto;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  parent_team_id uuid references public.teams(id) on delete restrict,
  lead_member_id uuid,
  plane_project_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text not null default '',
  gender text check (gender in ('male', 'female') or gender is null),
  team_id uuid not null references public.teams(id) on delete restrict,
  reports_to uuid references public.members(id) on delete restrict,
  sort_order integer not null default 0,
  plane_work_item_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams add constraint teams_lead_member_fk
  foreign key (lead_member_id) references public.members(id) on delete set null;

create index if not exists teams_parent_team_id_idx on public.teams(parent_team_id);
create index if not exists members_team_id_idx on public.members(team_id);
create index if not exists members_reports_to_idx on public.members(reports_to);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists members_set_updated_at on public.members;
create trigger members_set_updated_at before update on public.members
for each row execute function public.set_updated_at();
