-- Application API roles only; these are not Postgres/Supabase administrative roles.
alter table public.meeting_api_keys add column role text not null default 'writer'
  check (role in ('writer', 'teams_admin'));

create table public.meeting_api_key_role_events (
  id bigint generated always as identity primary key,
  api_key_id uuid not null references public.meeting_api_keys(id) on delete cascade,
  previous_role text not null,
  next_role text not null,
  created_at timestamptz not null default now()
);
alter table public.meeting_api_key_role_events enable row level security;
revoke all on public.meeting_api_key_role_events from public, anon, authenticated;
grant all on public.meeting_api_key_role_events to service_role;
grant usage, select on sequence public.meeting_api_key_role_events_id_seq to service_role;

create function public.set_meeting_api_key_role(p_key_id uuid, p_role text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare existing public.meeting_api_keys%rowtype;
begin
  if p_role is null or p_role not in ('writer','teams_admin') then raise exception '지원하지 않는 API 키 역할입니다.'; end if;
  select * into existing from public.meeting_api_keys where id=p_key_id for update;
  if not found then raise exception 'API 키를 찾을 수 없습니다.'; end if;
  if existing.role is distinct from p_role then
    update public.meeting_api_keys set role=p_role where id=p_key_id;
    insert into public.meeting_api_key_role_events(api_key_id,previous_role,next_role) values(p_key_id,existing.role,p_role);
  end if;
  return jsonb_build_object('id',p_key_id,'name',existing.name,'role',p_role);
end;
$$;
revoke all on function public.set_meeting_api_key_role(uuid,text) from public, anon, authenticated;
grant execute on function public.set_meeting_api_key_role(uuid,text) to service_role;

-- Hold the key lock until the entire read/mutation transaction ends. Role changes
-- and revocation therefore cannot race past an authorization check.
create function public.authorize_agent_api_key(p_key_hash text, p_admin boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare k public.meeting_api_keys%rowtype; t timestamptz;
begin
  select * into k from public.meeting_api_keys where key_hash=p_key_hash for update;
  t:=clock_timestamp();
  if not found or k.revoked_at is not null or k.expires_at<=t then return jsonb_build_object('error','invalid_api_key'); end if;
  if k.window_started_at<=t-interval '1 minute' then k.window_started_at:=t; k.window_count:=0; end if;
  if k.window_count>=60 then return jsonb_build_object('error','rate_limited'); end if;
  update public.meeting_api_keys set last_used_at=t,window_started_at=k.window_started_at,window_count=k.window_count+1 where id=k.id;
  if p_admin and k.role<>'teams_admin' then return jsonb_build_object('error','forbidden'); end if;
  return jsonb_build_object('id',k.id,'name',k.name,'role',k.role,'expiresAt',k.expires_at);
end;
$$;
revoke all on function public.authorize_agent_api_key(text,boolean) from public, anon, authenticated;
grant execute on function public.authorize_agent_api_key(text,boolean) to service_role;

-- Managers can mutate all meetings; writers retain their existing ownership boundary.
create or replace function public.mutate_agent_meeting(
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
  if api_key.role <> 'teams_admin' and not exists (select 1 from public.meeting_api_uploads where api_key_id = api_key.id and meeting_note_id = p_meeting_id) then
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

create function public.agent_ticket_json(p_ticket public.tickets, p_details boolean default false)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',p_ticket.id,'number',p_ticket.ticket_number,'title',p_ticket.title,
    'description',p_ticket.description,'typeId',p_ticket.type_id,'type',(select name from public.ticket_types where id=p_ticket.type_id),
    'status',(select name from public.ticket_statuses where id=p_ticket.status_id),'teamId',p_ticket.team_id,'assigneeId',p_ticket.assignee_id,
    'createdAt',p_ticket.created_at,'updatedAt',p_ticket.updated_at)
    || case when p_details then jsonb_build_object(
      'comments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'author',author,'body',body,'createdAt',created_at) order by created_at desc,id) from public.ticket_comments where ticket_id=p_ticket.id),'[]'::jsonb),
      'history',coalesce((select jsonb_agg(jsonb_build_object('id',id,'event',event,'createdAt',created_at) order by created_at desc,id) from public.ticket_history where ticket_id=p_ticket.id),'[]'::jsonb)) else '{}'::jsonb end;
$$;
revoke all on function public.agent_ticket_json(public.tickets,boolean) from public, anon, authenticated;
grant execute on function public.agent_ticket_json(public.tickets,boolean) to service_role;

create function public.read_agent_api(
  p_key_hash text, p_resource text, p_id text default null,
  p_limit integer default 20, p_offset integer default 0, p_query text default ''
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare identity jsonb; key_id uuid; admin boolean; note public.meeting_notes%rowtype; ticket public.tickets%rowtype; rows jsonb; more boolean;
begin
  identity:=public.authorize_agent_api_key(p_key_hash,p_resource in ('tickets','ticket-options'));
  if identity ? 'error' then return identity; end if;
  key_id:=(identity->>'id')::uuid; admin:=identity->>'role'='teams_admin';
  if p_resource='me' then
    return jsonb_build_object('key',identity,'permissions',jsonb_build_object(
      'meetings',jsonb_build_object('create',true,'read',case when admin then 'all' else 'own' end,'update',case when admin then 'all' else 'own' end,'delete',case when admin then 'all' else 'own' end),
      'tickets',jsonb_build_object('create',admin,'read',admin,'update',admin,'delete',admin),
      'manageKeys',false,'manageOrganization',false));
  end if;
  if p_resource is null or p_resource not in ('meetings','tickets','ticket-options') or p_limit is null or p_limit<1 or p_limit>100
     or p_offset is null or p_offset<0 or p_offset>1000000 or p_query is null or length(p_query)>160 then
    return jsonb_build_object('error','invalid_request');
  end if;
  if p_resource='ticket-options' then
    return jsonb_build_object(
      'types',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name) order by name) from public.ticket_types),'[]'::jsonb),
      'statuses',coalesce((select jsonb_agg(name order by sort_order) from public.ticket_statuses),'[]'::jsonb),
      'teams',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name) order by m.name,m.id) from public.members m where m.team_id=t.id),'[]'::jsonb)) order by t.name,t.id) from public.teams t),'[]'::jsonb));
  end if;
  if p_resource='meetings' then
    if p_id is not null then
      select * into note from public.meeting_notes n where n.id=p_id::uuid and n.deleted_at is null
        and (admin or exists(select 1 from public.meeting_api_uploads u where u.api_key_id=key_id and u.meeting_note_id=n.id));
      if not found then return jsonb_build_object('error','meeting_not_found'); end if;
      return jsonb_build_object('meeting',jsonb_build_object('id',note.id,'title',note.title,'date',note.meeting_date,
        'content',note.content,'status',note.status,'createdAt',note.created_at,'updatedAt',note.updated_at,
        'ticketIds',coalesce((select jsonb_agg(ticket_id order by ticket_id) from public.meeting_note_tickets where meeting_note_id=note.id),'[]'::jsonb),
        'comments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'author',author,'body',body,'createdAt',created_at) order by created_at desc,id) from public.meeting_comments where meeting_note_id=note.id),'[]'::jsonb)));
    end if;
    select coalesce(jsonb_agg(x.item order by x.meeting_date desc,x.id),'[]'::jsonb) into rows from (
      select n.id,n.meeting_date,jsonb_build_object('id',n.id,'title',n.title,'date',n.meeting_date,'status',n.status,'updatedAt',n.updated_at) as item
      from public.meeting_notes n where n.deleted_at is null and strpos(lower(n.title),lower(p_query))>0
        and (admin or exists(select 1 from public.meeting_api_uploads u where u.api_key_id=key_id and u.meeting_note_id=n.id))
      order by n.meeting_date desc,n.id limit p_limit+1 offset p_offset
    ) x;
  else
    if p_id is not null then
      select * into ticket from public.tickets where ticket_number=p_id;
      if not found then return jsonb_build_object('error','ticket_not_found'); end if;
      return jsonb_build_object('ticket',public.agent_ticket_json(ticket,true));
    end if;
    select coalesce(jsonb_agg(x.item order by x.created_at desc,x.id),'[]'::jsonb) into rows from (
      select t.id,t.created_at,public.agent_ticket_json(t) as item from public.tickets t
      where strpos(lower(t.title||' '||t.ticket_number),lower(p_query))>0
      order by t.created_at desc,t.id limit p_limit+1 offset p_offset
    ) x;
  end if;
  more:=jsonb_array_length(rows)>p_limit;
  if more then rows:=rows-p_limit; end if;
  return jsonb_build_object(p_resource,rows,'pagination',jsonb_build_object('limit',p_limit,'offset',p_offset,'hasMore',more,'nextOffset',case when more then p_offset+p_limit else null end));
end;
$$;
revoke all on function public.read_agent_api(text,text,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.read_agent_api(text,text,text,integer,integer,text) to service_role;

create table public.ticket_api_mutations (
  api_key_id uuid not null references public.meeting_api_keys(id) on delete cascade,
  request_id text not null,
  operation text not null check(operation in ('POST','PATCH','DELETE')),
  target text not null,
  payload_hash text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(api_key_id,request_id)
);
alter table public.ticket_api_mutations enable row level security;
revoke all on public.ticket_api_mutations from public, anon, authenticated;
grant all on public.ticket_api_mutations to service_role;

create function public.mutate_agent_ticket(
  p_key_hash text, p_request_id text, p_payload_hash text, p_operation text,
  p_ticket_number text default null, p_patch jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare identity jsonb; key_id uuid; previous public.ticket_api_mutations%rowtype; ticket public.tickets%rowtype; result jsonb; status_name text;
begin
  identity:=public.authorize_agent_api_key(p_key_hash,true);
  if identity ? 'error' then return identity; end if;
  key_id:=(identity->>'id')::uuid;
  if p_request_id is null or p_request_id !~ '^[A-Za-z0-9._:-]{1,128}$'
    or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
    or p_operation is null or p_operation not in ('POST','PATCH','DELETE')
    or p_patch is null or jsonb_typeof(p_patch)<>'object'
    or (p_operation='POST' and p_ticket_number is not null)
    or (p_operation<>'POST' and (p_ticket_number is null or p_ticket_number !~ '^T-[0-9]+$')) then
    return jsonb_build_object('error','invalid_request');
  end if;
  select * into previous from public.ticket_api_mutations where api_key_id=key_id and request_id=p_request_id;
  if found then
    if previous.operation<>p_operation or previous.target<>coalesce(p_ticket_number,'') or previous.payload_hash<>p_payload_hash then return jsonb_build_object('error','idempotency_conflict'); end if;
    if p_operation<>'DELETE' and not exists(select 1 from public.tickets where ticket_number=previous.result->>'number') then return jsonb_build_object('error','ticket_deleted'); end if;
    return jsonb_build_object('ticket',previous.result,'replayed',true);
  end if;
  if p_operation<>'DELETE' and (p_patch='{}'::jsonb or exists(select 1 from jsonb_object_keys(p_patch) f where f not in ('title','description','typeId','status','teamId','assigneeId'))) then
    return jsonb_build_object('error','invalid_request');
  end if;
  if p_operation<>'POST' then
    select * into ticket from public.tickets where ticket_number=p_ticket_number for update;
    if not found then return jsonb_build_object('error','ticket_not_found'); end if;
  end if;
  -- Keep validation failures atomic while retaining the rate-limit increment.
  begin
    if p_operation='POST' then
      if p_patch ? 'status' then return jsonb_build_object('error','invalid_request'); end if;
      result:=public.create_ticket(p_patch->>'title',p_patch->>'description',(p_patch->>'typeId')::uuid,(p_patch->>'teamId')::uuid,(p_patch->>'assigneeId')::uuid);
    elsif p_operation='PATCH' then
      select name into status_name from public.ticket_statuses where id=ticket.status_id;
      result:=public.update_ticket(p_ticket_number,
        case when p_patch ? 'title' then p_patch->>'title' else ticket.title end,
        case when p_patch ? 'description' then p_patch->>'description' else ticket.description end,
        case when p_patch ? 'typeId' then (p_patch->>'typeId')::uuid else ticket.type_id end,
        case when p_patch ? 'status' then p_patch->>'status' else status_name end,
        case when p_patch ? 'teamId' then (p_patch->>'teamId')::uuid else ticket.team_id end,
        case when p_patch ? 'assigneeId' then (p_patch->>'assigneeId')::uuid else ticket.assignee_id end);
    else
      result:=public.delete_ticket(p_ticket_number);
    end if;
  exception when raise_exception or invalid_text_representation or check_violation or not_null_violation or foreign_key_violation then
    return jsonb_build_object('error','invalid_ticket');
  end;
  result:=jsonb_build_object('id',result->>'ticketId','number',result->>'ticketNumber','path','/teams/tickets/'||(result->>'ticketNumber'));
  insert into public.ticket_api_mutations(api_key_id,request_id,operation,target,payload_hash,result)
    values(key_id,p_request_id,p_operation,coalesce(p_ticket_number,''),p_payload_hash,result);
  return jsonb_build_object('ticket',result,'replayed',false);
end;
$$;
revoke all on function public.mutate_agent_ticket(text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.mutate_agent_ticket(text,text,text,text,text,jsonb) to service_role;
notify pgrst, 'reload schema';
