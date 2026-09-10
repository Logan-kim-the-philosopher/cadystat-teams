import type { Meeting } from './site-data';

function env(name: string) { return process.env[name] ?? import.meta.env[name]; }

export async function getMeetingNotes() {
  const base = (env('CODY_STAT_SUPABASE_URL') ?? '').replace('/rest/v1', '');
  const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return [];
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const [notesResponse, linksResponse] = await Promise.all([
    fetch(`${base}/rest/v1/meeting_notes?select=id,title,meeting_date,content,status&status=eq.published&order=meeting_date.desc`, { headers }),
    fetch(`${base}/rest/v1/meeting_note_tickets?select=meeting_note_id,ticket_id`, { headers })
  ]);
  if (!notesResponse.ok || !linksResponse.ok) return [];
  const notes = await notesResponse.json();
  const links = await linksResponse.json();
  const linked = new Map<string, string[]>();
  for (const link of links) linked.set(link.meeting_note_id, [...(linked.get(link.meeting_note_id) ?? []), link.ticket_id]);
  return notes.map((note: any) => ({
    slug: note.id,
    date: note.meeting_date,
    title: note.title,
    coverImage: '',
    comments: 0,
    body: note.content,
    linkedTicketIds: linked.get(note.id) ?? [],
    status: note.status
  })) as Meeting[];
}
