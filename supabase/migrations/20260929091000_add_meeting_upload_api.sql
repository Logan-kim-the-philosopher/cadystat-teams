create table public.meeting_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 80),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  key_prefix text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  window_started_at timestamptz not null default now(),
  window_count integer not null default 0 check (window_count >= 0)
);

create table public.meeting_api_uploads (
  api_key_id uuid not null references public.meeting_api_keys(id) on delete cascade,
  request_id text not null check (request_id ~ '^[A-Za-z0-9._:-]{1,128}$'),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  meeting_note_id uuid references public.meeting_notes(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (api_key_id, request_id)
);
create index meeting_api_uploads_note_idx on public.meeting_api_uploads(meeting_note_id);

alter table public.meeting_api_keys enable row level security;
alter table public.meeting_api_uploads enable row level security;
revoke all on public.meeting_api_keys, public.meeting_api_uploads from public, anon, authenticated;
grant all on public.meeting_api_keys, public.meeting_api_uploads to service_role;

-- Serialize requests per key: expiry/revocation, limits, save and retry tracking
-- share one transaction even when several application instances accept uploads.
create function public.create_agent_meeting(
  p_key_hash text, p_request_id text, p_payload_hash text,
  p_title text, p_meeting_date date, p_content text, p_status text,
  p_ticket_ids uuid[] default '{}'
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  api_key public.meeting_api_keys%rowtype;
  previous public.meeting_api_uploads%rowtype;
  note_id uuid;
  current_time_at timestamptz;
begin
  select * into api_key from public.meeting_api_keys where key_hash = p_key_hash for update;
  current_time_at := clock_timestamp();
  if not found or api_key.revoked_at is not null or api_key.expires_at <= current_time_at then
    return jsonb_build_object('error', 'invalid_api_key');
  end if;
  if p_request_id is null or p_request_id !~ '^[A-Za-z0-9._:-]{1,128}$'
     or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('error', 'invalid_request');
  end if;
  if api_key.window_started_at <= current_time_at - interval '1 minute' then
    api_key.window_started_at := current_time_at;
    api_key.window_count := 0;
  end if;
  if api_key.window_count >= 60 then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  update public.meeting_api_keys set last_used_at = current_time_at,
    window_started_at = api_key.window_started_at, window_count = api_key.window_count + 1
    where id = api_key.id;

  select * into previous from public.meeting_api_uploads
    where api_key_id = api_key.id and request_id = p_request_id;
  if found then
    if previous.payload_hash <> p_payload_hash then
      return jsonb_build_object('error', 'idempotency_conflict');
    end if;
    if not exists (select 1 from public.meeting_notes where id = previous.meeting_note_id and deleted_at is null) then
      return jsonb_build_object('error', 'meeting_deleted');
    end if;
    return jsonb_build_object('id', previous.meeting_note_id, 'replayed', true);
  end if;

  if p_ticket_ids is null or exists (
    select 1 from unnest(p_ticket_ids) x where x is null or not exists (select 1 from public.tickets where id = x)
  ) then return jsonb_build_object('error', 'invalid_tickets'); end if;
  note_id := public.save_meeting_note(p_title, p_meeting_date, p_content, p_status, p_ticket_ids);
  insert into public.meeting_api_uploads(api_key_id, request_id, payload_hash, meeting_note_id)
    values (api_key.id, p_request_id, p_payload_hash, note_id);
  return jsonb_build_object('id', note_id, 'replayed', false);
end;
$$;
revoke all on function public.create_agent_meeting(text,text,text,text,date,text,text,uuid[]) from public, anon, authenticated;
grant execute on function public.create_agent_meeting(text,text,text,text,date,text,text,uuid[]) to service_role;
notify pgrst, 'reload schema';
