import type { APIRoute } from 'astro';

function config() {
  const url = (process.env.CODY_STAT_SUPABASE_URL ?? import.meta.env.CODY_STAT_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '');
  const key = process.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase 설정이 없습니다.');
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' } };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url, headers } = config();
    const body = await request.json();
    if (!body.name || !body.title || !body.gender || !body.team_id) return Response.json({ error: '필수 구성원 정보가 없습니다.' }, { status: 400 });
    const teamLookup = await fetch(`${url}/rest/v1/teams?or=(id.eq.${encodeURIComponent(body.team_id)},plane_project_id.eq.${encodeURIComponent(body.team_id)})&select=id`, { headers }); const team = (await teamLookup.json())[0];
    if (!team) return Response.json({ error: '팀을 찾을 수 없습니다.' }, { status: 404 });
    const response = await fetch(`${url}/rest/v1/members`, { method: 'POST', headers, body: JSON.stringify({ name: body.name, title: body.title, gender: body.gender, team_id: team.id, reports_to: body.reports_to ?? null, sort_order: body.sort_order ?? 0, plane_work_item_id: crypto.randomUUID() }) });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '구성원 생성 실패' }, { status: 400 }); }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const { url, headers } = config(); const body = await request.json();
    const { id, ...changes } = body; if (!id) return Response.json({ error: '구성원 ID가 필요합니다.' }, { status: 400 });
    const lookup = await fetch(`${url}/rest/v1/members?plane_work_item_id=eq.${encodeURIComponent(id)}&select=id`, { headers }); const found = (await lookup.json())[0];
    const internalId = found?.id ?? id;
    const response = await fetch(`${url}/rest/v1/members?id=eq.${encodeURIComponent(internalId)}`, { method: 'PATCH', headers, body: JSON.stringify(changes) });
    return new Response(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '구성원 수정 실패' }, { status: 400 }); }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { url, headers } = config(); const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: '구성원 ID가 필요합니다.' }, { status: 400 });
    const lookup = await fetch(`${url}/rest/v1/members?plane_work_item_id=eq.${encodeURIComponent(id)}&select=id`, { headers });
    let found = (await lookup.json())[0];
    if (!found) { const fallback = await fetch(`${url}/rest/v1/members?id=eq.${encodeURIComponent(id)}&select=id`, { headers }); found = (await fallback.json())[0]; }
    if (!found) return Response.json({ error: '구성원을 찾을 수 없습니다.' }, { status: 404 });
    const ticketCleanup = await fetch(`${url}/rest/v1/tickets?assignee_id=eq.${found.id}`, { method: 'PATCH', headers, body: JSON.stringify({ assignee_id: null }) });
    const reportCleanup = await fetch(`${url}/rest/v1/members?reports_to=eq.${found.id}`, { method: 'PATCH', headers, body: JSON.stringify({ reports_to: null }) });
    const leadCleanup = await fetch(`${url}/rest/v1/teams?lead_member_id=eq.${found.id}`, { method: 'PATCH', headers, body: JSON.stringify({ lead_member_id: null }) });
    if (!ticketCleanup.ok || !reportCleanup.ok || !leadCleanup.ok) return Response.json({ error: '구성원 관계 정리에 실패했습니다.' }, { status: 502 });
    const response = await fetch(`${url}/rest/v1/members?id=eq.${encodeURIComponent(found.id)}`, { method: 'DELETE', headers });
    if (response.status === 204) return new Response(null, { status: 204 });
    return new Response(await response.text(), { status: response.status });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '구성원 삭제 실패' }, { status: 400 }); }
};
