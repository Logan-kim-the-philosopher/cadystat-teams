export const schema = `
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  parent_team_id TEXT REFERENCES teams(id) ON DELETE RESTRICT,
  lead_member_id TEXT REFERENCES members(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  title TEXT NOT NULL DEFAULT '',
  gender TEXT CHECK (gender IN ('male', 'female')),
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  reports_to TEXT REFERENCES members(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ticket_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS ticket_statuses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT OR IGNORE INTO counters VALUES ('ticket', 1000);
INSERT OR IGNORE INTO ticket_types VALUES ('bug', '버그'), ('feature', '기능 요청');
INSERT OR IGNORE INTO ticket_statuses VALUES ('new', '신규', 0), ('assigned', '배정', 1), ('done', '완료', 2);
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
  assignee_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  type_id TEXT NOT NULL REFERENCES ticket_types(id),
  status_id TEXT NOT NULL REFERENCES ticket_statuses(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (status_id != 'assigned' OR team_id IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS ticket_comments (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ticket_history (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meeting_notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  meeting_date TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'))
);
CREATE TABLE IF NOT EXISTS meeting_comments (
  id TEXT PRIMARY KEY,
  meeting_slug TEXT NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meeting_note_tickets (
  meeting_note_id TEXT NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  PRIMARY KEY (meeting_note_id, ticket_id)
);
CREATE TABLE IF NOT EXISTS seed_versions (version INTEGER PRIMARY KEY);
CREATE INDEX IF NOT EXISTS members_team_idx ON members(team_id);
CREATE INDEX IF NOT EXISTS tickets_team_idx ON tickets(team_id);
CREATE INDEX IF NOT EXISTS ticket_comments_ticket_idx ON ticket_comments(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS ticket_history_ticket_idx ON ticket_history(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS meeting_comments_note_idx ON meeting_comments(meeting_slug, created_at);
CREATE INDEX IF NOT EXISTS meeting_links_ticket_idx ON meeting_note_tickets(ticket_id);
PRAGMA user_version = 1;
`;
