import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { schema } from './schema.ts';
import { seedDatabase } from './seed.ts';

export function openDatabase(filename: string, seed = true) {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  try {
    db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    db.exec(schema);
    if (seed) seedDatabase(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

let database: DatabaseSync | undefined;
export function getDatabase() {
  const env = import.meta.env ?? {};
  const filename = process.env.SQLITE_PATH ?? env.SQLITE_PATH ?? './data/codystat.sqlite';
  const seed = (process.env.SQLITE_SEED ?? env.SQLITE_SEED) !== '0';
  return database ??= openDatabase(filename, seed);
}

export function transaction<T>(db: DatabaseSync, callback: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

if (import.meta.hot) import.meta.hot.dispose(() => database?.close());
