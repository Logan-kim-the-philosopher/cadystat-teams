import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { openDatabase } from '../src/lib/server/database.ts';
import { DataError, Repository } from '../src/lib/server/repository.ts';
import { seedDatabase } from '../src/lib/server/seed.ts';

function fixture(t: { after: (fn: () => void) => void }, seed = true) {
  const db = openDatabase(':memory:', seed);
  t.after(() => db.close());
  return { db, store: new Repository(db) };
}
const ticketBody = { title: '테스트 티켓', description: '작업 설명', type: '버그', status: '신규' };

test('all sample entities and links are present; seeding preserves user edits and deletions', (t) => {
  const { db, store } = fixture(t);
  assert.equal(store.getOrganization().teams.length, 4);
  assert.equal(store.getOrganization().members.length, 10);
  assert.equal(store.getTickets().tickets.length, 18);
  assert.deepEqual(Object.fromEntries(['신규', '배정', '완료'].map((status) => [status, store.getTickets().tickets.filter((ticket) => ticket.status === status).length])), { 신규: 6, 배정: 6, 완료: 6 });
  assert.equal(store.getMeetings().length, 8);
  assert.ok(store.getMeetings().every((note) => note.comments === 2));
  assert.ok(store.getTickets().tickets.every((ticket) => ticket.detail.comments.length === 2 && ticket.detail.history.length));
  assert.ok(store.getMeetings().flatMap((note) => note.linkedTicketIds).every((id) => store.getTickets().tickets.some((ticket) => ticket.id === id)));
  store.updateTicket('T-102', { title: '수정한 제목' });
  store.deleteTicket('T-135');
  seedDatabase(db);
  assert.equal(store.getTickets().tickets.find((ticket) => ticket.id === 'T-102')!.title, '수정한 제목');
  assert.equal(store.getTickets().tickets.length, 17);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});

test('ticket transitions enforce assignment, log history, and clear assignment on return to new', (t) => {
  const { store } = fixture(t);
  const [ticket] = store.createTicket(ticketBody);
  assert.throws(() => store.updateTicket(ticket.ticket_number, { status: '배정' }), /담당 팀/);
  const [assigned] = store.updateTicket(ticket.ticket_number, { team_id: 'engineering', assignee_id: 'engineering-bak', status: '배정' });
  assert.equal(assigned.team_id, 'org-engineering');
  assert.equal(assigned.assignee_id, 'engineering-bak');
  store.updateTicket(ticket.ticket_number, { status: '완료' });
  assert.ok(store.getTickets().tickets.find((item) => item.id === ticket.ticket_number)!.detail.history.includes('상태 변경: 완료'));
  const [unassigned] = store.updateTicket(ticket.ticket_number, { status: '신규' });
  assert.equal(unassigned.team_id, null);
  assert.equal(unassigned.assignee_id, null);
  assert.throws(() => store.updateTicket(ticket.ticket_number, { type: '잘못된 유형' }), /유형/);
  assert.throws(() => store.updateTicket(ticket.ticket_number, { title: ' ' }), /제목/);
  assert.throws(() => store.updateTicket(ticket.ticket_number, { status: '보류' }), /상태/);
  assert.throws(() => store.updateTicket(ticket.ticket_number, { team_id: 'engineering', assignee_id: 'product-jeong' }), /해당 팀/);
});

test('ticket deletion cascades to comments, history, and meeting links', (t) => {
  const { db, store } = fixture(t);
  const [ticket] = store.createTicket(ticketBody);
  store.addTicketComment({ ticket_id: ticket.ticket_number, body: '댓글', author: '테스터' });
  const meeting = store.createMeeting({ title: '연결 회의', meeting_date: '2026-09-29', content: '본문', linkedTicketIds: [ticket.ticket_number] });
  assert.equal(store.getTicketComments(ticket.ticket_number)[0].body, '댓글');
  store.deleteTicket(ticket.ticket_number);
  for (const table of ['ticket_comments', 'ticket_history', 'meeting_note_tickets']) assert.equal(db.prepare(`SELECT count(*) AS count FROM ${table} WHERE ticket_id = ?`).get(ticket.id)!.count, 0);
  assert.deepEqual(store.getMeetings().find((note) => note.id === meeting.id)!.linkedTicketIds, []);
  const [next] = store.createTicket(ticketBody);
  assert.notEqual(next.ticket_number, ticket.ticket_number);
});

test('team create/edit/delete supports draft leaders and rolls back invalid member edits', (t) => {
  const { store, db } = fixture(t);
  const { team, member } = store.createTeam({ name: 'QA팀', leadName: '테스터', leadTitle: 'QA 리드', leadGender: 'female', parentTeamId: 'org-executive' });
  store.updateTeam({ teamId: team.id, name: '품질팀', leadMemberId: 'draft-new', members: [{ id: 'draft-new', action: 'create', name: '신규팀장', title: 'QA 리드', gender: 'male' }] });
  const changed = store.getOrganization().teams.find((item) => item.id === team.id)!;
  assert.notEqual(changed.leadMemberId, member!.id);
  assert.equal(store.getOrganization().members.find((item) => item.id === member!.id)!.reportsTo, changed.leadMemberId);
  assert.throws(() => store.updateTeam({ teamId: team.id, name: '실패해야함', members: [{ id: 'engineering-bak', action: 'delete' }] }), /해당 팀/);
  assert.equal(store.getOrganization().teams.find((item) => item.id === team.id)!.name, '품질팀');
  assert.ok(store.getOrganization().members.some((item) => item.id === 'engineering-bak'));
  assert.throws(() => store.createTeam({ name: '품질팀', leadName: '중복', leadTitle: '리드', leadGender: 'male' }), (error: unknown) => error instanceof DataError && error.status === 409);
  const [ticket] = store.createTicket({ ...ticketBody, status: '배정', team_id: team.id, assignee_id: member!.id });
  store.deleteTeam(team.id);
  const unassigned = store.getTickets().tickets.find((item) => item.id === ticket.ticket_number)!;
  assert.equal(unassigned.status, '신규');
  assert.equal(unassigned.teamSlug, '');
  assert.ok(!store.getOrganization().members.some((item) => item.teamProjectId === team.id));
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});

test('deleting a parent team fails without changing its leader', (t) => {
  const { store } = fixture(t);
  const before = store.getOrganization();
  assert.throws(() => store.deleteTeam('org-executive'), (error: unknown) => error instanceof DataError && error.status === 409);
  assert.deepEqual(store.getOrganization(), before);
});

test('meeting publication, links, comments, and validation use the same stored data', (t) => {
  const { store } = fixture(t);
  const draft = store.createMeeting({ title: '초안', meeting_date: '2026-09-29', content: '본문', status: 'draft', linkedTicketIds: ['T-102'] });
  assert.ok(!store.getMeetings(true).some((note) => note.id === draft.id));
  const meeting = store.createMeeting({ title: '공개 회의', meeting_date: '2026-09-29', content: '본문', linkedTicketIds: ['T-102'] });
  const comment = store.addMeetingComment({ meeting_slug: meeting.id, body: '  확인했습니다.  ' });
  assert.equal(comment.body, '확인했습니다.');
  assert.equal(comment.author, '운영자');
  assert.equal(store.getMeetings(true).find((note) => note.id === meeting.id)!.comments, 1);
  assert.equal(store.getMeetingComments(meeting.id)[0].id, comment.id);
  assert.equal(store.getMeetingComments().length, 5);
  assert.ok(store.getTickets().tickets.find((ticket) => ticket.id === 'T-102')!.detail.linkedMeetings.includes(meeting.id));
  assert.throws(() => store.addMeetingComment({ meeting_slug: 'missing', body: '댓글' }), /찾을 수/);
  assert.throws(() => store.addTicketComment({ ticket_id: 'T-102', body: ' ' }), /댓글 내용/);
  const count = store.getMeetings().length;
  assert.throws(() => store.createMeeting({ title: '오류', meeting_date: '2026-02-30', content: '본문' }), /회의 날짜/);
  assert.throws(() => store.createMeeting({ title: '오류', meeting_date: '2026-09-29', content: '본문', linkedTicketIds: ['missing'] }), /찾을 수/);
  assert.equal(store.getMeetings().length, count);
});

test('SQLite file persists edits across reopen without reseeding deleted rows', () => {
  const directory = mkdtempSync(join(tmpdir(), 'codystat-sqlite-'));
  let db: ReturnType<typeof openDatabase> | undefined;
  try {
    const filename = join(directory, 'test.sqlite');
    db = openDatabase(filename);
    const store = new Repository(db);
    store.updateTicket('T-102', { title: '재실행 후 유지' });
    store.deleteTicket('T-135');
    db.close();
    db = openDatabase(filename);
    const reloaded = new Repository(db);
    assert.equal(reloaded.getTickets().tickets.length, 17);
    assert.equal(reloaded.getTickets().tickets.find((ticket) => ticket.id === 'T-102')!.title, '재실행 후 유지');
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { db?.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('an unseeded database has only lookup data and accepts new records', (t) => {
  const { store } = fixture(t, false);
  assert.equal(store.getOrganization().teams.length, 0);
  assert.equal(store.getTickets().tickets.length, 0);
  assert.equal(store.getMeetings().length, 0);
  assert.equal(store.createTicket(ticketBody)[0].ticket_number, 'T-1001');
});
