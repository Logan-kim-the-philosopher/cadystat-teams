import type { APIRoute } from 'astro';

function env(name: string) { return process.env[name] ?? import.meta.env[name]; }
function config() { const base = (env('CODY_STAT_SUPABASE_URL') ?? '').replace(/\/rest\/v1\/?$/, ''); const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY'); return { base, key, headers: { apikey: key ?? '', Authorization: `Bearer ${key ?? ''}`, 'Content-Type': 'application/json' } }; }

export const GET: APIRoute = async () => {
  const { base, key, headers } = config(); if (!base || !key) return Response.json({ error: 'Supabase 설정 누락' }, { status: 503 });
  const response = await fetch(`${base}/rest/v1/meeting_notes?select=id,next_meeting_at&status=eq.published&order=meeting_date.desc&limit=1`, { headers });
  if (!response.ok) return Response.json({ error: '일정 조회에 실패했습니다.' }, { status: 502 });
  const rows = await response.json(); return Response.json({ starts_at: rows[0]?.next_meeting_at ?? null });
};

export const PATCH: APIRoute = async ({ request }) => {
  const { base, key, headers } = config(); if (!base || !key) return Response.json({ error: 'Supabase 설정 누락' }, { status: 503 });
  const body = await request.json().catch(() => ({})); const date = new Date(body.starts_at);
  if (!body.starts_at || Number.isNaN(date.getTime())) return Response.json({ error: '올바른 날짜와 시간을 입력하세요.' }, { status: 400 });
  const latestResponse = await fetch(`${base}/rest/v1/meeting_notes?select=id&status=eq.published&order=meeting_date.desc&limit=1`, { headers });
  if (!latestResponse.ok) return Response.json({ error: '최근 회의록을 찾지 못했습니다.' }, { status: 404 });
  const latest = await latestResponse.json();
  if (!latest[0]?.id) return Response.json({ error: '최근 회의록을 찾지 못했습니다.' }, { status: 404 });
  const response = await fetch(`${base}/rest/v1/meeting_notes?id=eq.${encodeURIComponent(latest[0].id)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ next_meeting_at: date.toISOString() }) });
  if (!response.ok) return Response.json({ error: '일정 저장에 실패했습니다.' }, { status: 502 });
  const rows = await response.json(); return Response.json({ starts_at: rows[0]?.next_meeting_at ?? date.toISOString() });
};
