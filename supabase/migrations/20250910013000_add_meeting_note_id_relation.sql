alter table public.meeting_note_tickets
  add column if not exists meeting_note_id uuid references public.meeting_notes(id) on delete cascade;

create index if not exists meeting_note_tickets_note_id_idx
  on public.meeting_note_tickets (meeting_note_id);
