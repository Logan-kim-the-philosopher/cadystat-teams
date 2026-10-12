import { getRepository } from './server/repository';

export function getMeetingNotes() {
  return getRepository().getMeetings(true).map((note) => ({
    slug: note.id, title: note.title, date: note.meeting_date, body: note.content,
    coverImage: '', comments: note.comments, linkedTicketIds: note.linkedTicketIds, status: note.status,
  }));
}
