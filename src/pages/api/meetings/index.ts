import type { APIRoute } from 'astro';

function env(name: string) { return process.env[name] ?? import.meta.env[name]; }

export const GET: APIRoute = async () => {
  const base = (env('CODY_STAT_SUPABASE_URL') ?? '').replace('/rest/v1', '');
  const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return Response.json({ error: 'Supabase 설정 누락' }, { status: 503 });
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const [notesResponse, linksResponse] = await Promise.all([
    fetch(`${base}/rest/v1/meeting_notes?select=id,title,meeting_date,content,status&order=meeting_date.desc`, { headers }),
    fetch(`${base}/rest/v1/meeting_note_tickets?select=meeting_note_id,ticket_id`, { headers })
  ]);
  if (!notesResponse.ok || !linksResponse.ok) return Response.json({ error: '회의록 조회 실패' }, { status: 502 });
  const notes = await notesResponse.json();
  const links = await linksResponse.json();
  const linked = new Map<string, string[]>();
  for (const link of links) linked.set(link.meeting_note_id, [...(linked.get(link.meeting_note_id) ?? []), link.ticket_id]);
  return Response.json(notes.map((note: any) => ({ ...note, linkedTicketIds: linked.get(note.id) ?? [] })));
};
