import type { APIRoute } from 'astro';

function config() {
  const base = (process.env.CODY_STAT_SUPABASE_URL ?? import.meta.env.CODY_STAT_SUPABASE_URL ?? '').replace('/rest/v1', '');
  const key = process.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Supabase 설정 누락');
  return { base, key };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { base, key } = config();
    const body = await request.json();
    if (!body.ticket_id || !body.body?.trim()) return Response.json({ error: '티켓과 댓글 내용은 필수입니다.' }, { status: 400 });
    const ticketResponse = await fetch(`${base}/rest/v1/tickets?ticket_number=eq.${encodeURIComponent(body.ticket_id)}&select=id`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const ticket = (await ticketResponse.json())[0];
    if (!ticket) return Response.json({ error: '티켓을 찾을 수 없습니다.' }, { status: 404 });
    const response = await fetch(`${base}/rest/v1/ticket_comments`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ ticket_id: ticket.id, author: body.author?.trim() || '운영자', body: body.body.trim() }) });
    return Response.json(await response.json(), { status: response.status });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '댓글 저장 실패' }, { status: 400 }); }
};
