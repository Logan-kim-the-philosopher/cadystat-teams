-- Keep deleted meeting content and comments recoverable by the DB owner.
alter table public.meeting_notes add column deleted_at timestamptz;

create index meeting_notes_visible_date_idx
on public.meeting_notes(meeting_date desc) where deleted_at is null;
