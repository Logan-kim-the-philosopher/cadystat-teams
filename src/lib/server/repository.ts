import { randomUUID } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { getDatabase, transaction } from './database.ts';
import type { OrgUnit } from '../site-data.ts';

type Input = Record<string, unknown>;
type Team = { id: string; slug: string; name: string; parent_team_id: string | null; lead_member_id: string | null };
type Member = { id: string; name: string; title: string; gender: 'male' | 'female'; team_id: string; reports_to: string | null; sort_order: number };
type Ticket = { id: string; ticket_number: string; title: string; description: string; team_id: string | null; assignee_id: string | null; type_id: string; status_id: string; created_at: string; updated_at: string };
type Comment = { id: string; author: string; body: string; created_at: string; ticket_id?: string; meeting_slug?: string };
type Note = { id: string; title: string; meeting_date: string; content: string; status: string };

export class DataError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const required = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new DataError(`${label}은(는) 필수입니다.`);
  return value.trim();
};
const gender = (value: unknown) => {
  if (value !== 'male' && value !== 'female') throw new DataError('유효하지 않은 성별입니다.');
  return value;
};
export const inputObject = (value: unknown): Input => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DataError('JSON 객체가 필요합니다.');
  return value as Input;
};

export class Repository {
  db: DatabaseSync;
  constructor(db: DatabaseSync) { this.db = db; }
  private all<T>(sql: string, ...values: SQLInputValue[]) { return this.db.prepare(sql).all(...values) as T[]; }
  private one<T>(sql: string, ...values: SQLInputValue[]) { return this.db.prepare(sql).get(...values) as T | undefined; }
  private run(sql: string, ...values: SQLInputValue[]) { return this.db.prepare(sql).run(...values); }
  private team(value: unknown) {
    const id = required(value, '팀');
    const team = this.one<Team>('SELECT * FROM teams WHERE id = ? OR slug = ? OR name = ?', id, id, id);
    if (!team) throw new DataError('팀을 찾을 수 없습니다.', 404);
    return team;
  }
  private ticket(value: unknown) {
    const id = required(value, '티켓 ID');
    const ticket = this.one<Ticket>('SELECT * FROM tickets WHERE ticket_number = ? OR id = ?', id, id);
    if (!ticket) throw new DataError('티켓을 찾을 수 없습니다.', 404);
    return ticket;
  }
  private note(value: unknown) {
    const note = this.one<Note>('SELECT * FROM meeting_notes WHERE id = ?', required(value, '회의록 ID'));
    if (!note) throw new DataError('회의록을 찾을 수 없습니다.', 404);
    return note;
  }
  private history(id: string, event: string) {
    this.run('INSERT INTO ticket_history VALUES (?, ?, ?, ?)', randomUUID(), id, event, new Date().toISOString());
  }
  private uniqueTeamName(name: string, except = '') {
    if (this.one('SELECT 1 FROM teams WHERE name = ? AND id != ?', name, except)) throw new DataError('이미 같은 이름의 팀이 있습니다.', 409);
  }

  getOrganization() {
    return {
      teams: this.all<Team>('SELECT * FROM teams ORDER BY rowid').map((team) => ({
        id: team.id, slug: team.slug, workItemId: team.id, name: team.name, parentTeamId: team.parent_team_id, leadMemberId: team.lead_member_id,
      })),
      members: this.all<Member>('SELECT * FROM members ORDER BY sort_order, rowid').map((member) => ({
        id: member.id, name: member.name, title: member.title, gender: member.gender, teamProjectId: member.team_id, reportsTo: member.reports_to, sortOrder: member.sort_order,
      })),
    };
  }

  getOrganizationUnits(): Array<OrgUnit & { lead?: string }> {
    const { teams, members } = this.getOrganization();
    return teams.map((team, index) => ({
      id: team.id, slug: team.slug, name: team.name, parentId: team.parentTeamId, leadMemberId: team.leadMemberId,
      lead: members.find((person) => person.id === team.leadMemberId)?.name,
      description: `${team.name}의 구성원과 담당 업무입니다.`, responsibilities: [], tone: index % 2 ? 'green' : 'blue',
      members: members.filter((person) => person.teamProjectId === team.id).length,
      tickets: this.one<{ count: number }>("SELECT count(*) AS count FROM tickets WHERE team_id = ? AND status_id != 'done'", team.id)!.count,
      people: members.filter((person) => person.teamProjectId === team.id).map((person) => ({
        id: person.id, name: person.name, title: person.title, gender: person.gender, orgUnitId: team.id, reportsToMemberId: person.reportsTo,
      })),
    }));
  }

  createTeam(body: Input) {
    return transaction(this.db, () => {
      const name = required(body.name, '팀 이름');
      this.uniqueTeamName(name);
      const id = randomUUID(), memberId = randomUUID();
      const parentId = body.parentTeamId ? this.team(body.parentTeamId).id : null;
      const leadName = required(body.leadName, '팀장 이름'), leadTitle = required(body.leadTitle, '직책'), leadGender = gender(body.leadGender);
      this.run('INSERT INTO teams (id, slug, name, parent_team_id) VALUES (?, ?, ?, ?)', id, id, name, parentId);
      this.run('INSERT INTO members (id, name, title, gender, team_id) VALUES (?, ?, ?, ?, ?)', memberId, leadName, leadTitle, leadGender, id);
      this.run('UPDATE teams SET lead_member_id = ? WHERE id = ?', memberId, id);
      return { ok: true, team: this.team(id), member: this.one<Member>('SELECT * FROM members WHERE id = ?', memberId) };
    });
  }

  updateTeam(body: Input) {
    return transaction(this.db, () => {
      const team = this.team(body.teamId);
      const name = body.name === undefined ? team.name : required(body.name, '팀 이름');
      this.uniqueTeamName(name, team.id);
      this.run('UPDATE teams SET name = ? WHERE id = ?', name, team.id);
      const draftIds = new Map<string, string>();
      if (body.members !== undefined && !Array.isArray(body.members)) throw new DataError('구성원 목록이 필요합니다.');
      for (const value of (body.members ?? []) as unknown[]) {
        const member = inputObject(value);
        const action = member.action ?? 'update';
        if (!['create', 'update', 'delete'].includes(String(action))) throw new DataError('유효하지 않은 구성원 작업입니다.');
        if (action === 'create') {
          const id = randomUUID();
          this.run('INSERT INTO members (id, name, title, gender, team_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            id, required(member.name, '이름'), required(member.title, '직책'), gender(member.gender), team.id,
            typeof member.sortOrder === 'number' && Number.isInteger(member.sortOrder) ? member.sortOrder : 0);
          if (typeof member.id === 'string') draftIds.set(member.id, id);
        } else {
          const id = required(member.id, '구성원 ID');
          if (!this.one('SELECT 1 FROM members WHERE id = ? AND team_id = ?', id, team.id)) throw new DataError('해당 팀의 구성원을 찾을 수 없습니다.', 404);
          if (action === 'delete') this.run('DELETE FROM members WHERE id = ?', id);
          else this.run('UPDATE members SET name = ?, title = ?, gender = ? WHERE id = ?', required(member.name, '이름'), required(member.title, '직책'), gender(member.gender), id);
        }
      }
      const requestedLead = body.leadMemberId === undefined ? this.team(team.id).lead_member_id : body.leadMemberId;
      const leadId = requestedLead ? draftIds.get(String(requestedLead)) ?? required(requestedLead, '팀장 ID') : null;
      if (leadId && !this.one('SELECT 1 FROM members WHERE id = ? AND team_id = ?', leadId, team.id)) throw new DataError('팀장은 해당 팀 소속이어야 합니다.');
      this.run('UPDATE teams SET lead_member_id = ? WHERE id = ?', leadId, team.id);
      this.run('UPDATE members SET reports_to = CASE WHEN id = ? THEN NULL ELSE ? END WHERE team_id = ?', leadId, leadId, team.id);
      return { ok: true };
    });
  }

  deleteTeam(id: unknown) {
    return transaction(this.db, () => {
      const team = this.team(id);
      if (this.one('SELECT 1 FROM teams WHERE parent_team_id = ?', team.id)) throw new DataError('하위 팀이 있는 팀은 삭제할 수 없습니다.', 409);
      const tickets = this.all<Ticket>('SELECT * FROM tickets WHERE team_id = ?', team.id);
      for (const ticket of tickets) {
        this.run("UPDATE tickets SET team_id = NULL, assignee_id = NULL, status_id = CASE WHEN status_id = 'assigned' THEN 'new' ELSE status_id END, updated_at = ? WHERE id = ?", new Date().toISOString(), ticket.id);
        this.history(ticket.id, `${team.name} 삭제로 담당 팀 해제`);
      }
      this.run('DELETE FROM teams WHERE id = ?', team.id);
    });
  }

  getTickets() {
    const teams = this.all<Team>('SELECT * FROM teams ORDER BY rowid');
    const members = this.all<Member>('SELECT * FROM members');
    const types = this.all<{ id: string; name: string }>('SELECT * FROM ticket_types');
    const statuses = this.all<{ id: string; name: string }>('SELECT * FROM ticket_statuses');
    const comments = this.all<Comment>('SELECT * FROM ticket_comments ORDER BY created_at DESC, rowid DESC');
    const history = this.all<{ ticket_id: string; event: string }>('SELECT * FROM ticket_history ORDER BY created_at, rowid');
    const links = this.all<{ ticket_id: string; meeting_note_id: string }>('SELECT * FROM meeting_note_tickets');
    return {
      tickets: this.all<Ticket>('SELECT * FROM tickets ORDER BY created_at DESC, rowid DESC').map((ticket) => {
        const team = teams.find((item) => item.id === ticket.team_id);
        const status = statuses.find((item) => item.id === ticket.status_id)!.name;
        const type = types.find((item) => item.id === ticket.type_id)!.name;
        const detail = {
          id: ticket.ticket_number, title: ticket.title, status, type, ownerTeam: team?.name ?? '',
          assignee: members.find((item) => item.id === ticket.assignee_id)?.name ?? '미배정', description: ticket.description,
          history: history.filter((item) => item.ticket_id === ticket.id).map((item) => item.event),
          comments: comments.filter((item) => item.ticket_id === ticket.id).map((item) => ({ author: item.author, body: item.body, createdAt: item.created_at })),
          linkedMeetings: links.filter((item) => item.ticket_id === ticket.id).map((item) => item.meeting_note_id),
        };
        return { id: ticket.ticket_number, title: ticket.title, team: team?.name ?? '', teamSlug: team?.id ?? '', status, type, createdAt: ticket.created_at.slice(0, 10), detail };
      }),
      teams: teams.map((team) => ({ id: team.id, name: team.name, slug: team.id })),
    };
  }

  private ticketValues(body: Input, current?: Ticket) {
    const title = required(body.title ?? current?.title, '제목');
    const description = required(body.description ?? current?.description, '설명');
    const typeValue = body.type ?? body.type_id ?? current?.type_id;
    const type = this.one<{ id: string }>('SELECT id FROM ticket_types WHERE id = ? OR name = ?', required(typeValue, '유형'), String(typeValue));
    if (!type) throw new DataError('유효하지 않은 티켓 유형입니다.');
    const statusValue = body.status ?? body.status_id ?? current?.status_id ?? 'new';
    const status = this.one<{ id: string; name: string }>('SELECT id, name FROM ticket_statuses WHERE id = ? OR name = ?', required(statusValue, '상태'), String(statusValue));
    if (!status) throw new DataError('유효하지 않은 티켓 상태입니다.');
    const teamValue = body.team_id !== undefined ? body.team_id : body.team_name !== undefined ? body.team_name : current?.team_id;
    let teamId = teamValue && teamValue !== '모르겠음' ? this.team(teamValue).id : null;
    if (current && status.id === 'new' && (body.status !== undefined || body.status_id !== undefined)) teamId = null;
    if (status.id === 'assigned' && !teamId) throw new DataError('담당 팀이 지정된 티켓만 배정할 수 있습니다.');
    let assigneeId = body.assignee_id !== undefined ? body.assignee_id : teamId === current?.team_id ? current?.assignee_id : null;
    if (!teamId) assigneeId = null;
    if (assigneeId && !this.one('SELECT 1 FROM members WHERE id = ? AND team_id = ?', required(assigneeId, '담당자'), teamId!)) throw new DataError('담당자는 해당 팀 소속이어야 합니다.');
    return { title, description, typeId: type.id, statusId: status.id, statusName: status.name, teamId, assigneeId: assigneeId ? String(assigneeId) : null };
  }

  createTicket(body: Input) {
    return transaction(this.db, () => {
      const values = this.ticketValues(body);
      const { value } = this.one<{ value: number }>("UPDATE counters SET value = value + 1 WHERE name = 'ticket' RETURNING value")!;
      const id = randomUUID(), now = new Date().toISOString();
      this.run('INSERT INTO tickets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', id, `T-${value}`, values.title, values.description, values.teamId, values.assigneeId, values.typeId, values.statusId, now, now);
      this.history(id, `티켓 접수 · ${values.statusName}`);
      return [this.ticket(id)];
    });
  }

  updateTicket(id: unknown, body: Input) {
    return transaction(this.db, () => {
      const current = this.ticket(id), values = this.ticketValues(body, current);
      this.run('UPDATE tickets SET title = ?, description = ?, team_id = ?, assignee_id = ?, type_id = ?, status_id = ?, updated_at = ? WHERE id = ?',
        values.title, values.description, values.teamId, values.assigneeId, values.typeId, values.statusId, new Date().toISOString(), current.id);
      this.history(current.id, current.status_id !== values.statusId ? `상태 변경: ${values.statusName}` : '티켓 정보 변경');
      return [this.ticket(current.id)];
    });
  }

  deleteTicket(id: unknown) {
    this.run('DELETE FROM tickets WHERE id = ?', this.ticket(id).id);
    return { ok: true };
  }
  getTicketComments(id: unknown) {
    return this.all<Comment>('SELECT * FROM ticket_comments WHERE ticket_id = ? ORDER BY created_at DESC, rowid DESC', this.ticket(id).id);
  }
  addTicketComment(body: Input) {
    const id = randomUUID();
    this.run('INSERT INTO ticket_comments VALUES (?, ?, ?, ?, ?)', id, this.ticket(body.ticket_id).id,
      typeof body.author === 'string' && body.author.trim() ? body.author.trim() : '운영자', required(body.body, '댓글 내용'), new Date().toISOString());
    return [this.one<Comment>('SELECT * FROM ticket_comments WHERE id = ?', id)!];
  }
  getMeetings(publishedOnly = false) {
    return this.all<Note>(`SELECT * FROM meeting_notes ${publishedOnly ? "WHERE status = 'published'" : ''} ORDER BY meeting_date DESC, rowid DESC`).map((note) => ({
      ...note,
      linkedTicketIds: this.all<{ ticket_number: string }>('SELECT t.ticket_number FROM meeting_note_tickets l JOIN tickets t ON t.id = l.ticket_id WHERE l.meeting_note_id = ?', note.id).map((ticket) => ticket.ticket_number),
      comments: this.one<{ count: number }>('SELECT count(*) AS count FROM meeting_comments WHERE meeting_slug = ?', note.id)!.count,
    }));
  }
  createMeeting(body: Input) {
    return transaction(this.db, () => {
      const id = randomUUID(), title = required(body.title, '제목'), date = required(body.meeting_date, '회의 날짜');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new DataError('유효한 회의 날짜가 필요합니다.');
      const status = body.status ?? 'published';
      if (!['draft', 'published', 'archived'].includes(String(status))) throw new DataError('유효하지 않은 회의록 상태입니다.');
      this.run('INSERT INTO meeting_notes VALUES (?, ?, ?, ?, ?)', id, title, date, required(body.content, '회의 내용'), String(status));
      if (body.linkedTicketIds !== undefined && !Array.isArray(body.linkedTicketIds)) throw new DataError('연결할 티켓 목록이 필요합니다.');
      for (const ticketId of (body.linkedTicketIds ?? []) as unknown[]) this.run('INSERT OR IGNORE INTO meeting_note_tickets VALUES (?, ?)', id, this.ticket(ticketId).id);
      return this.getMeetings().find((note) => note.id === id)!;
    });
  }
  getMeetingComments(slug?: string | null) {
    return slug
      ? this.all<Comment>('SELECT * FROM meeting_comments WHERE meeting_slug = ? ORDER BY created_at DESC, rowid DESC', this.note(slug).id)
      : this.all<Comment>("SELECT c.* FROM meeting_comments c JOIN meeting_notes n ON n.id = c.meeting_slug WHERE n.status = 'published' ORDER BY c.created_at DESC, c.rowid DESC LIMIT 5");
  }
  addMeetingComment(body: Input) {
    const id = randomUUID();
    this.run('INSERT INTO meeting_comments VALUES (?, ?, ?, ?, ?)', id, this.note(body.meeting_slug).id,
      typeof body.author === 'string' && body.author.trim() ? body.author.trim() : '운영자', required(body.body, '댓글 내용'), new Date().toISOString());
    return this.one<Comment>('SELECT * FROM meeting_comments WHERE id = ?', id)!;
  }
}

export const getRepository = () => new Repository(getDatabase());
