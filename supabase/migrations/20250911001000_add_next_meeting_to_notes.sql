alter table public.meeting_notes
  add column if not exists next_meeting_at timestamptz;
