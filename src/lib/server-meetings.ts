import type { Meeting } from './site-data';

function env(name: string) { return process.env[name] ?? import.meta.env[name]; }

type MeetingNotesResponse = Awaited<ReturnType<typeof getMeetingNotes>>;
let lastSuccessfulNotes: MeetingNotesResponse | null = null;

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
      if (response.ok) return response;
      lastError = new Error(`Supabase request failed (${response.status})`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  throw lastError instanceof Error ? lastError : new Error('Supabase request failed');
}

export async function getNextMeeting() {
  const base = (env('CODY_STAT_SUPABASE_URL') ?? '').replace(/\/rest\/v1\/?$/, '');
  const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return null;
  try {
    const response = await fetchWithRetry(`${base}/rest/v1/meeting_notes?select=next_meeting_at&status=eq.published&order=meeting_date.desc&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }, 1);
    const rows = await response.json();
    return rows[0]?.next_meeting_at ?? null;
  } catch (error) {
    console.error('[meetings] failed to load next meeting:', error);
    return null;
  }
}

export async function getMeetingNotes() {
  const base = (env('CODY_STAT_SUPABASE_URL') ?? '').replace(/\/rest\/v1\/?$/, '');
  const key = env('CODY_STAT_SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return lastSuccessfulNotes ?? [];
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  let notes: any[];
  try {
    const response = await fetchWithRetry(`${base}/rest/v1/meeting_notes?select=id,title,meeting_date,content,status&status=eq.published&order=meeting_date.desc`, { headers });
    notes = await response.json();
  } catch (error) {
    console.error('[meetings] failed to load notes:', error);
    return lastSuccessfulNotes ?? [];
  }

  let links: any[] = [];
  try {
    const response = await fetchWithRetry(`${base}/rest/v1/meeting_note_tickets?select=meeting_note_id,ticket_id`, { headers });
    links = await response.json();
  } catch (error) {
    // Ticket links are optional; do not hide the meeting archive when this request fails.
    console.error('[meetings] failed to load ticket links:', error);
  }
  const linked = new Map<string, string[]>();
  for (const link of links) linked.set(link.meeting_note_id, [...(linked.get(link.meeting_note_id) ?? []), link.ticket_id]);
  const result = notes.map((note: any) => ({
    slug: note.id,
    date: note.meeting_date,
    title: note.title,
    coverImage: '',
    comments: 0,
    body: note.content,
    linkedTicketIds: linked.get(note.id) ?? [],
    status: note.status
  })) as Meeting[];
  lastSuccessfulNotes = result;
  return result;
}
