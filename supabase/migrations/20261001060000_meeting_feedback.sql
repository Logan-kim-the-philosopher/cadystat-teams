-- Create meeting notes and their new tickets in one transaction.
create function public.save_meeting_with_tickets(
  p_title text, p_meeting_date date, p_content text, p_status text,
  p_ticket_ids uuid[] default '{}', p_meeting_id uuid default null,
  p_new_tickets jsonb default '[]'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare note_id uuid; draft jsonb; type_id uuid; created jsonb;
begin
  if p_meeting_id is not null then
    perform 1 from public.meeting_notes where id = p_meeting_id and deleted_at is null for update;
    if not found then raise exception '회의록을 찾을 수 없습니다.'; end if;
  end if;
  if p_new_tickets is null or jsonb_typeof(p_new_tickets) <> 'array' or jsonb_array_length(p_new_tickets) > 20 then
    raise exception '새 티켓은 20개 이하여야 합니다.';
  end if;
  if coalesce(cardinality(p_ticket_ids), 0) + jsonb_array_length(p_new_tickets) > 100 then
    raise exception '연결 티켓은 100개 이하여야 합니다.';
  end if;
  note_id := public.save_meeting_note(p_title, p_meeting_date, p_content, p_status, p_ticket_ids, p_meeting_id);
  for draft in select value from jsonb_array_elements(p_new_tickets) loop
    if jsonb_typeof(draft) <> 'object' then raise exception '새 티켓 형식이 올바르지 않습니다.'; end if;
    select id into type_id from public.ticket_types where name = coalesce(draft->>'type', '기능 요청');
    created := public.create_ticket(draft->>'title', draft->>'description', type_id);
    insert into public.meeting_note_tickets(meeting_note_id, ticket_id) values (note_id, (created->>'ticketId')::uuid);
  end loop;
  return note_id;
end;
$$;
revoke all on function public.save_meeting_with_tickets(text,date,text,text,uuid[],uuid,jsonb) from public, anon, authenticated;
grant execute on function public.save_meeting_with_tickets(text,date,text,text,uuid[],uuid,jsonb) to service_role;

-- Keep the same upload contract and add optional ticket drafts.
drop function public.create_agent_meeting(text,text,text,text,date,text,text,uuid[]);
create function public.create_agent_meeting(
  p_key_hash text, p_request_id text, p_payload_hash text,
  p_title text, p_meeting_date date, p_content text, p_status text,
  p_ticket_ids uuid[] default '{}', p_new_tickets jsonb default '[]'
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
  note_id := public.save_meeting_with_tickets(p_title, p_meeting_date, p_content, p_status, p_ticket_ids, null, p_new_tickets);
  insert into public.meeting_api_uploads(api_key_id, request_id, payload_hash, meeting_note_id)
    values (api_key.id, p_request_id, p_payload_hash, note_id);
  return jsonb_build_object('id', note_id, 'replayed', false);
end;
$$;
revoke all on function public.create_agent_meeting(text,text,text,text,date,text,text,uuid[],jsonb) from public, anon, authenticated;
grant execute on function public.create_agent_meeting(text,text,text,text,date,text,text,uuid[],jsonb) to service_role;
notify pgrst, 'reload schema';

create table public.meeting_api_mutations (
  api_key_id uuid not null references public.meeting_api_keys(id) on delete cascade,
  request_id text not null,
  meeting_note_id uuid not null references public.meeting_notes(id) on delete cascade,
  operation text not null check (operation in ('PATCH','DELETE')),
  payload_hash text not null,
  created_at timestamptz not null default now(),
  primary key (api_key_id, request_id)
);
alter table public.meeting_api_mutations enable row level security;
revoke all on public.meeting_api_mutations from public, anon, authenticated;
grant all on public.meeting_api_mutations to service_role;

create function public.mutate_agent_meeting(
  p_key_hash text, p_request_id text, p_payload_hash text,
  p_meeting_id uuid, p_operation text, p_patch jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  api_key public.meeting_api_keys%rowtype;
  previous public.meeting_api_mutations%rowtype;
  note public.meeting_notes%rowtype;
  current_time_at timestamptz;
  ticket_ids uuid[];
begin
  select * into api_key from public.meeting_api_keys where key_hash = p_key_hash for update;
  current_time_at := clock_timestamp();
  if not found or api_key.revoked_at is not null or api_key.expires_at <= current_time_at then
    return jsonb_build_object('error', 'invalid_api_key');
  end if;
  if p_request_id is null or p_request_id !~ '^[A-Za-z0-9._:-]{1,128}$'
     or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
     or p_operation is null or p_operation not in ('PATCH','DELETE')
     or p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    return jsonb_build_object('error', 'invalid_request');
  end if;
  if api_key.window_started_at <= current_time_at - interval '1 minute' then
    api_key.window_started_at := current_time_at; api_key.window_count := 0;
  end if;
  if api_key.window_count >= 60 then return jsonb_build_object('error', 'rate_limited'); end if;
  update public.meeting_api_keys set last_used_at = current_time_at,
    window_started_at = api_key.window_started_at, window_count = api_key.window_count + 1 where id = api_key.id;

  -- Ownership comes from existing upload records, including keys issued before this migration.
  if not exists (select 1 from public.meeting_api_uploads where api_key_id = api_key.id and meeting_note_id = p_meeting_id) then
    return jsonb_build_object('error', 'meeting_not_found');
  end if;
  select * into note from public.meeting_notes where id = p_meeting_id for update;
  if not found then return jsonb_build_object('error', 'meeting_not_found'); end if;
  select * into previous from public.meeting_api_mutations where api_key_id = api_key.id and request_id = p_request_id;
  if found then
    if previous.payload_hash <> p_payload_hash or previous.operation <> p_operation or previous.meeting_note_id <> p_meeting_id then
      return jsonb_build_object('error', 'idempotency_conflict');
    end if;
    if p_operation = 'PATCH' and note.deleted_at is not null then return jsonb_build_object('error', 'meeting_deleted'); end if;
    return jsonb_build_object('id', p_meeting_id, 'replayed', true);
  end if;
  if p_operation = 'DELETE' then
    update public.meeting_notes set deleted_at = coalesce(deleted_at, current_time_at) where id = p_meeting_id;
  else
    if note.deleted_at is not null then return jsonb_build_object('error', 'meeting_not_found'); end if;
    if p_patch = '{}'::jsonb or exists (select 1 from jsonb_object_keys(p_patch) k where k not in ('title','date','content','status','ticketIds')) then
      return jsonb_build_object('error', 'invalid_request');
    end if;
    if p_patch ? 'ticketIds' then
      if jsonb_typeof(p_patch->'ticketIds') <> 'array' then return jsonb_build_object('error', 'invalid_request'); end if;
      select coalesce(array_agg(value::uuid), '{}') into ticket_ids from jsonb_array_elements_text(p_patch->'ticketIds');
    else
      select coalesce(array_agg(ticket_id), '{}') into ticket_ids from public.meeting_note_tickets where meeting_note_id = p_meeting_id;
    end if;
    if exists (select 1 from unnest(ticket_ids) x where x is null or not exists (select 1 from public.tickets where id = x)) then
      return jsonb_build_object('error', 'invalid_tickets');
    end if;
    perform public.save_meeting_with_tickets(
      case when p_patch ? 'title' then p_patch->>'title' else note.title end,
      case when p_patch ? 'date' then (p_patch->>'date')::date else note.meeting_date end,
      case when p_patch ? 'content' then p_patch->>'content' else note.content end,
      case when p_patch ? 'status' then p_patch->>'status' else note.status end,
      ticket_ids, p_meeting_id
    );
  end if;
  insert into public.meeting_api_mutations(api_key_id, request_id, meeting_note_id, operation, payload_hash)
    values (api_key.id, p_request_id, p_meeting_id, p_operation, p_payload_hash);
  return jsonb_build_object('id', p_meeting_id, 'replayed', false);
end;
$$;
revoke all on function public.mutate_agent_meeting(text,text,text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.mutate_agent_meeting(text,text,text,uuid,text,jsonb) to service_role;
notify pgrst, 'reload schema';
