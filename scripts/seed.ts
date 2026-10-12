import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { openDatabase } from '../src/lib/server/database.ts';

if (existsSync('.env')) process.loadEnvFile('.env');
const filename = process.env.SQLITE_PATH ?? './data/codystat.sqlite';
const db = openDatabase(filename);
try {
  const tables = ['teams', 'members', 'tickets', 'ticket_history', 'ticket_comments', 'meeting_notes', 'meeting_comments', 'meeting_note_tickets'];
  console.log(`SQLite: ${filename === ':memory:' ? filename : resolve(filename)}`);
  for (const table of tables) console.log(`${table}: ${db.prepare(`SELECT count(*) AS count FROM ${table}`).get()!.count}`);
} finally {
  db.close();
}
