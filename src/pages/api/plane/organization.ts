import type { APIRoute } from 'astro';

type CachedOrganization = { expiresAt: number; body: string };
let organizationCache: CachedOrganization | null = null;

function env(name: string) {
  return process.env[name] ?? import.meta.env[name];
}

async function supabaseGet<T>(table: string) {
  const url = (env('CODY_STAT_SUPABASE_URL') ?? '').replace(/\/rest\/v1\/?$/, '');
  const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase 설정 누락: CODY_STAT_SUPABASE_URL 또는 CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`Supabase ${table} 조회 실패 (${response.status})`);
  return await response.json() as T;
}

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const url = (env('CODY_STAT_SUPABASE_URL') ?? '').replace(/\/rest\/v1\/?$/, ''); const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key || !body.teamId) return Response.json({ error: '팀 정보가 없습니다.' }, { status: 400 });
    const headers = { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
    if (Array.isArray(body.members)) {
      const rpc = await fetch(`${url}/rest/v1/rpc/save_organization_team`, { method: 'POST', headers, body: JSON.stringify({ p_team_id: body.teamId, p_name: String(body.name ?? '').trim(), p_lead_member_id: body.leadMemberId ?? '', p_members: body.members }) });
      if (!rpc.ok) return Response.json({ error: await rpc.text() }, { status: rpc.status });
      organizationCache = null;
      return Response.json({ ok: true });
    }
    const lookup = await fetch(`${url}/rest/v1/teams?plane_project_id=eq.${encodeURIComponent(body.teamId)}&select=id`, { headers }); const found = (await lookup.json())[0];
    if (!found) return Response.json({ error: '팀을 찾을 수 없습니다.' }, { status: 404 });
    let leadMemberId = undefined;
    if (Object.prototype.hasOwnProperty.call(body, 'leadMemberId')) { if (!body.leadMemberId) { leadMemberId = null; } else { const leadLookup = await fetch(`${url}/rest/v1/members?or=(id.eq.${encodeURIComponent(body.leadMemberId)},plane_work_item_id.eq.${encodeURIComponent(body.leadMemberId)})&select=id,team_id`, { headers }); const candidate = (await leadLookup.json())[0]; if (!candidate || candidate.team_id !== found.id) return Response.json({ error: '팀장으로 지정할 구성원은 해당 팀 소속이어야 합니다.' }, { status: 400 }); leadMemberId = candidate.id; } }
    if (body.name === '운영진') leadMemberId = null;
    const response = await fetch(`${url}/rest/v1/teams?id=eq.${found.id}`, { method: 'PATCH', headers, body: JSON.stringify({ name: body.name, ...(Object.prototype.hasOwnProperty.call(body, 'leadMemberId') ? { lead_member_id: leadMemberId } : {}) }) });
    if (leadMemberId) {
      const teamMembers = await fetch(`${url}/rest/v1/members?team_id=eq.${found.id}&select=id`, { headers });
      for (const member of await teamMembers.json()) {
        await fetch(`${url}/rest/v1/members?id=eq.${member.id}`, { method: 'PATCH', headers, body: JSON.stringify({ reports_to: member.id === leadMemberId ? null : leadMemberId }) });
      }
    }
    organizationCache = null; return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '팀 수정 실패' }, { status: 400 }); }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const teamId = new URL(request.url).searchParams.get('id'); const url = (env('CODY_STAT_SUPABASE_URL') ?? '').replace(/\/rest\/v1\/?$/, ''); const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key || !teamId) return Response.json({ error: '팀 ID가 필요합니다.' }, { status: 400 });
    const headers = { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const lookup = await fetch(`${url}/rest/v1/teams?or=(id.eq.${encodeURIComponent(teamId)},plane_project_id.eq.${encodeURIComponent(teamId)})&select=id`, { headers }); const team = (await lookup.json())[0];
    if (!team) return Response.json({ error: '팀을 찾을 수 없습니다.' }, { status: 404 });
    await fetch(`${url}/rest/v1/teams?id=eq.${team.id}`, { method: 'PATCH', headers, body: JSON.stringify({ lead_member_id: null }) });
    const childTeams = await fetch(`${url}/rest/v1/teams?parent_team_id=eq.${team.id}&select=id`, { headers }); if ((await childTeams.json()).length) return Response.json({ error: '하위 팀이 있는 팀은 삭제할 수 없습니다.' }, { status: 409 });
    const members = await fetch(`${url}/rest/v1/members?team_id=eq.${team.id}&select=id`, { headers });
    await fetch(`${url}/rest/v1/tickets?team_id=eq.${team.id}`, { method: 'PATCH', headers, body: JSON.stringify({ team_id: null, assignee_id: null }) });
    await fetch(`${url}/rest/v1/members?team_id=eq.${team.id}`, { method: 'PATCH', headers, body: JSON.stringify({ reports_to: null }) });
    for (const member of await members.json()) { await fetch(`${url}/rest/v1/tickets?assignee_id=eq.${member.id}`, { method: 'PATCH', headers, body: JSON.stringify({ assignee_id: null, team_id: null }) }); await fetch(`${url}/rest/v1/members?id=eq.${member.id}`, { method: 'DELETE', headers }); }
    const response = await fetch(`${url}/rest/v1/teams?id=eq.${team.id}`, { method: 'DELETE', headers }); organizationCache = null; if (response.status === 204) return new Response(null, { status: 204 }); return new Response(await response.text(), { status: response.status });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '팀 삭제 실패' }, { status: 400 }); }
};

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get('content-type')?.includes('application/json')) {
    try {
      const body = await request.json();
      if (!body.name || !body.leadName || !body.leadTitle || !body.leadGender) return Response.json({ error: '팀장 정보를 포함한 필수값이 필요합니다.' }, { status: 400 });
      const url = (env('CODY_STAT_SUPABASE_URL') ?? '').replace(/\/rest\/v1\/?$/, '');
      const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !key) throw new Error('Supabase 설정 누락');
      const headers = { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
      const duplicateResponse = await fetch(`${url}/rest/v1/teams?name=eq.${encodeURIComponent(body.name.trim())}&select=id`, { headers });
      if (!duplicateResponse.ok) return Response.json({ error: '팀 이름 중복 여부를 확인하지 못했습니다.' }, { status: 502 });
      if ((await duplicateResponse.json()).length > 0) return Response.json({ error: '이미 같은 이름의 팀이 있습니다.' }, { status: 409 });
      let parentTeamId = null;
      if (body.parentTeamId) {
        const parentResponse = await fetch(`${url}/rest/v1/teams?plane_project_id=eq.${encodeURIComponent(body.parentTeamId)}&select=id`, { headers });
        const parents = await parentResponse.json();
        parentTeamId = parents[0]?.id ?? body.parentTeamId;
      }
      const teamResponse = await fetch(`${url}/rest/v1/teams`, { method: 'POST', headers, body: JSON.stringify({ name: body.name, parent_team_id: parentTeamId, plane_project_id: crypto.randomUUID(), lead_member_id: null }) });
      if (!teamResponse.ok) return Response.json({ error: await teamResponse.text() }, { status: teamResponse.status });
      const team = (await teamResponse.json())[0];
      const memberResponse = await fetch(`${url}/rest/v1/members`, { method: 'POST', headers, body: JSON.stringify({ name: body.leadName, title: body.leadTitle, gender: body.leadGender, team_id: team.id, reports_to: null, sort_order: 0, plane_work_item_id: crypto.randomUUID() }) });
      if (!memberResponse.ok) { await fetch(`${url}/rest/v1/teams?id=eq.${team.id}`, { method: 'DELETE', headers }); return Response.json({ error: await memberResponse.text() }, { status: memberResponse.status }); }
      const member = (await memberResponse.json())[0];
      const leadLinkResponse = await fetch(`${url}/rest/v1/teams?id=eq.${team.id}`, { method: 'PATCH', headers, body: JSON.stringify({ lead_member_id: member.id }) });
      if (!leadLinkResponse.ok) { await fetch(`${url}/rest/v1/members?id=eq.${member.id}`, { method: 'DELETE', headers }); await fetch(`${url}/rest/v1/teams?id=eq.${team.id}`, { method: 'DELETE', headers }); return Response.json({ error: await leadLinkResponse.text() }, { status: 502 }); }
      organizationCache = null;
      return Response.json({ ok: true, team, member }, { status: 201 });
    } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '팀 생성 실패' }, { status: 400 }); }
  }
  const expectedSecret = env('PLANE_WEBHOOK_SECRET');
  const receivedSecret = request.headers.get('x-plane-webhook-secret') ?? request.headers.get('x-webhook-secret');
  if (!expectedSecret || receivedSecret !== expectedSecret) return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
  organizationCache = null;
  return Response.json({ ok: true, invalidated: true });
};

export const GET: APIRoute = async ({ url: requestUrl }) => {
  const forceRefresh = requestUrl.searchParams.has('refresh');
  if (!forceRefresh && organizationCache && organizationCache.expiresAt > Date.now()) {
    return new Response(organizationCache.body, { headers: { 'Content-Type': 'application/json', 'X-Organization-Cache': 'HIT' } });
  }
  try {
    const [teams, members] = await Promise.all([
      supabaseGet<Array<{ id: string; name: string; parent_team_id: string | null; lead_member_id: string | null; plane_project_id: string | null }>>('teams'),
      supabaseGet<Array<{ id: string; name: string; title: string; gender: 'male' | 'female' | null; team_id: string; reports_to: string | null; sort_order: number; plane_work_item_id: string | null }>>('members'),
    ]);
    const result = {
      teams: teams.map((team) => ({ id: team.plane_project_id ?? team.id, workItemId: team.id, name: team.name, parentTeamId: team.parent_team_id ? (teams.find((parent) => parent.id === team.parent_team_id)?.plane_project_id ?? team.parent_team_id) : null, leadMemberId: members.find((member) => member.id === team.lead_member_id)?.plane_work_item_id ?? team.lead_member_id })),
      members: members.map((member) => ({ id: member.plane_work_item_id ?? member.id, name: member.name, title: member.title, gender: member.gender, teamProjectId: teams.find((team) => team.id === member.team_id)?.plane_project_id ?? member.team_id, reportsTo: members.find((parent) => parent.id === member.reports_to)?.plane_work_item_id ?? member.reports_to, sortOrder: member.sort_order })),
    };
    const body = JSON.stringify(result);
    organizationCache = { body, expiresAt: Date.now() + 30_000 };
    return new Response(body, { headers: { 'Content-Type': 'application/json', 'X-Organization-Cache': 'MISS' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '조직도 DB 조회에 실패했습니다.' }, { status: 503 });
  }
};
