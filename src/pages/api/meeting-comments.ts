import type { APIRoute } from 'astro';

const env = (name: string) => process.env[name] ?? import.meta.env[name];

function config() {
  const base = (env('CODY_STAT_SUPABASE_URL') ?? '').replace(/\/rest\/v1\/?$/, '');
  const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) throw new Error('Supabase 설정 누락');
  return { base, key };
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const slug = url.searchParams.get('slug');
    const { base, key } = config();
    const query = slug
      ? `meeting_slug=eq.${encodeURIComponent(slug)}&select=id,meeting_slug,author,body,created_at`
      : 'select=id,meeting_slug,author,body,created_at&order=created_at.desc&limit=5';
    const response = await fetch(`${base}/rest/v1/meeting_comments?${query}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!response.ok) return Response.json({ error: await response.text() }, { status: response.status });
    return Response.json(await response.json());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '댓글 조회 실패' }, { status: 503 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.meeting_slug || !body.body?.trim()) return Response.json({ error: '회의록과 댓글 내용은 필수입니다.' }, { status: 400 });
    const { base, key } = config();
    const response = await fetch(`${base}/rest/v1/meeting_comments`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ meeting_slug: body.meeting_slug, author: body.author?.trim() || '운영자', body: body.body.trim() }) });
    if (!response.ok) return Response.json({ error: await response.text() }, { status: response.status });
    return Response.json((await response.json())[0], { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '댓글 저장 실패' }, { status: 400 });
  }
};
