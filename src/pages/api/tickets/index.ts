import type { APIRoute } from 'astro';
function env(name: string) { return process.env[name] ?? import.meta.env[name]; }
async function query(table: string) {
  const base = (env('CODY_STAT_SUPABASE_URL') ?? '').replace('/rest/v1', '');
  const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) throw new Error('Supabase 설정 누락');
  const response = await fetch(`${base}/rest/v1/${table}?select=*`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`Supabase ${table} 조회 실패 (${response.status})`);
  return response.json() as Promise<any[]>;
}
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.title?.trim() || !body.description?.trim()) return Response.json({ error: '제목과 설명은 필수입니다.' }, { status: 400 });
    if (!['버그', '기능 요청'].includes(body.type)) return Response.json({ error: '유효하지 않은 티켓 유형입니다.' }, { status: 400 });
    const base = (env('CODY_STAT_SUPABASE_URL') ?? '').replace('/rest/v1', '');
    const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
    if (!base || !key) throw new Error('Supabase 설정 누락');
    const lookup = async (table: string, column: string, value: string) => {
      const response = await fetch(`${base}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}&select=id`, { headers: { apikey: key!, Authorization: `Bearer ${key}` } });
      const rows = await response.json();
      return rows[0]?.id;
    };
    if (!body.type_id && body.type) body.type_id = await lookup('ticket_types', 'name', body.type);
    if (!body.status_id && body.status) body.status_id = await lookup('ticket_statuses', 'name', body.status);
    if (!body.team_id && body.team_name) body.team_id = await lookup('teams', 'name', body.team_name);
    delete body.type; delete body.status; delete body.team_name;
    const response = await fetch(`${base}/rest/v1/tickets`, { method: 'POST', headers: { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(body) });
    if (!response.ok) return Response.json({ error: await response.text() }, { status: response.status });
    return Response.json(await response.json(), { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '티켓 생성 실패' }, { status: 400 }); }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'id가 필요합니다.' }, { status: 400 });
    const base = (env('CODY_STAT_SUPABASE_URL') ?? '').replace('/rest/v1', '');
    const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
    const body = await request.json();
    if (body.status && !['신규', '배정', '완료'].includes(body.status)) return Response.json({ error: '유효하지 않은 티켓 상태입니다.' }, { status: 400 });
    const teamAliases: Record<string, string> = { engineering: '개발팀', product: '마케팅팀', operations: '경영지원팀', executive: '운영진' };
    if (body.team_id && teamAliases[body.team_id]) {
      const teamResponse = await fetch(`${base}/rest/v1/teams?name=eq.${encodeURIComponent(teamAliases[body.team_id])}&select=id`, { headers: { apikey: key!, Authorization: `Bearer ${key}` } });
      const matchedTeams = await teamResponse.json();
      body.team_id = matchedTeams[0]?.id;
    }
    if (body.type) { const typeResponse = await fetch(`${base}/rest/v1/ticket_types?name=eq.${encodeURIComponent(body.type)}&select=id`, { headers: { apikey: key!, Authorization: `Bearer ${key}` } }); const types = await typeResponse.json(); body.type_id = types[0]?.id; delete body.type; }
    if (body.status) { const statusResponse = await fetch(`${base}/rest/v1/ticket_statuses?name=eq.${encodeURIComponent(body.status)}&select=id`, { headers: { apikey: key!, Authorization: `Bearer ${key}` } }); const statuses = await statusResponse.json(); body.status_id = statuses[0]?.id; delete body.status; }
    const response = await fetch(`${base}/rest/v1/tickets?ticket_number=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(body) });
    if (!response.ok) return Response.json({ error: await response.text() }, { status: response.status });
    const updated = await response.json();
    if (updated[0]?.id) await fetch(`${base}/rest/v1/ticket_history`, { method: 'POST', headers: { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_id: updated[0].id, event: body.status ? `상태 변경: ${body.status}` : '티켓 정보 변경' }) });
    return Response.json(updated);
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '티켓 수정 실패' }, { status: 400 }); }
};

export const DELETE: APIRoute = async ({ request }) => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'id가 필요합니다.' }, { status: 400 });
  const base = (env('CODY_STAT_SUPABASE_URL') ?? '').replace('/rest/v1', '');
  const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${base}/rest/v1/tickets?ticket_number=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { apikey: key!, Authorization: `Bearer ${key}` } });
  return response.ok ? Response.json({ ok: true }) : Response.json({ error: await response.text() }, { status: response.status });
};

export const GET: APIRoute = async () => {
  try {
    const [tickets, teams, members, types, statuses, comments, history] = await Promise.all(['tickets', 'teams', 'members', 'ticket_types', 'ticket_statuses', 'ticket_comments', 'ticket_history'].map(query));
    const teamById = new Map(teams.map((x) => [x.id, x]));
    const typeById = new Map(types.map((x) => [x.id, x.name]));
    const statusById = new Map(statuses.map((x) => [x.id, x.name]));
    const memberById = new Map(members.map((x) => [x.id, x.name]));
    const teamSlugs: Record<string, string> = { 개발팀: 'engineering', 마케팅팀: 'product', 경영지원팀: 'operations', 운영진: 'executive' };
    const result = tickets.map((ticket) => {
      const team = teamById.get(ticket.team_id);
      const ticketComments = comments.filter((x) => x.ticket_id === ticket.id);
      const detail = { id: ticket.ticket_number, title: ticket.title, status: statusById.get(ticket.status_id) ?? '신규', type: typeById.get(ticket.type_id) ?? '', ownerTeam: team?.name ?? '', assignee: memberById.get(ticket.assignee_id) ?? '미배정', description: ticket.description, history: history.filter((x) => x.ticket_id === ticket.id).map((x) => x.event), comments: ticketComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((x) => ({ author: x.author ?? '운영자', body: x.body, createdAt: x.created_at })), linkedMeetings: [] };
      return { id: ticket.ticket_number, title: ticket.title, team: team?.name ?? '', teamSlug: team?.id ?? '', status: detail.status, type: detail.type, createdAt: ticket.created_at.slice(0, 10), detail };
    });
    const teamsResult = teams.map((team) => ({ id: team.id, name: team.name, slug: team.id }));
    return Response.json({ tickets: result, teams: teamsResult });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '티켓 조회 실패' }, { status: 503 }); }
};
