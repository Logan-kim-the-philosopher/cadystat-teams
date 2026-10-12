import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { root } from './helpers/local-server.mjs';

// Fixed local project container only: no DATABASE_URL or remote target accepted.
const container = 'supabase_db_codystat_teams';
const restoreDb = `codystat_teams_restore_${Date.now()}`;
assert.match(restoreDb, /^codystat_teams_restore_\d+$/);
const tables = [
  'teams', 'members', 'ticket_types', 'ticket_statuses', 'tickets', 'ticket_history', 'ticket_comments',
  'meeting_notes', 'meeting_comments', 'meeting_note_tickets', 'meeting_api_keys', 'meeting_api_uploads',
  'meeting_api_mutations', 'meeting_api_key_role_events', 'ticket_api_mutations'
];
function docker(args, options = {}) { return execFileSync('docker', args, { maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'], ...options }); }
function sql(database, statement) {
  return docker(['exec', '-i', '-e', 'PGOPTIONS=-c search_path=public,extensions', container, 'psql', '-U', 'supabase_admin', '-d', database, '-v', 'ON_ERROR_STOP=1', '-At'], { input: statement, encoding: 'utf8' }).trim();
}
function snapshot(database) {
  const rows = tables.map((table) => JSON.parse(sql(database, `select jsonb_build_object('table','${table}','count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text),''))) from public.${table} t;`)));
  const security = JSON.parse(sql(database, "select jsonb_build_object('rls',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity),'constraints',(select count(*) from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public'),'anonRead',has_table_privilege('anon','public.teams','SELECT'),'serviceRead',has_table_privilege('service_role','public.teams','SELECT'),'runtimeRead',has_table_privilege('teams_runtime','public.teams','SELECT'),'runtimeWrite',has_function_privilege('teams_runtime','public.save_meeting_note(text,date,text,text,uuid[],uuid)','EXECUTE'),'runtimeBypass',(select rolbypassrls from pg_roles where rolname='teams_runtime'));"));
  const sequence = sql(database, 'select last_value,is_called from public.ticket_number_seq;');
  return { rows, security, sequence };
}
let created = false;
try {
  const before = snapshot('postgres');
  assert.equal(before.security.rls, tables.length);
  assert.equal(before.security.anonRead, false);
  assert.equal(before.security.serviceRead, false);
  assert.equal(before.security.runtimeRead, true);
  assert.equal(before.security.runtimeWrite, true);
  assert.equal(before.security.runtimeBypass, false);
  const dump = docker(['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres', '--format=custom', '--schema=public', '--no-owner']);
  assert.ok(dump.length > 0);
  docker(['exec', container, 'createdb', '-U', 'postgres', restoreDb]); created = true;
  // Remove only the empty default schema of this freshly-created DB (no CASCADE).
  sql(restoreDb, 'drop schema public; create schema if not exists extensions; create extension if not exists pgcrypto with schema extensions; create extension if not exists pgtap with schema extensions;');
  docker(['exec', '-i', container, 'pg_restore', '-U', 'supabase_admin', '-d', restoreDb, '--exit-on-error', '--no-owner'], { input: dump });
  assert.deepEqual(snapshot(restoreDb), before, '전체 테이블 데이터·RLS·제약·권한·sequence 복구 일치');
  let tapTests = 0;
  for (const file of (await readdir(`${root}supabase/tests/database`)).filter((name) => name.endsWith('.sql')).sort()) {
    const result = sql(restoreDb, await readFile(`${root}supabase/tests/database/${file}`, 'utf8'));
    assert.doesNotMatch(result, /^not ok/m, file);
    const plan = result.match(/^1\.\.(\d+)$/m); assert.ok(plan, file); tapTests += Number(plan[1]);
  }
  const afterTests = snapshot(restoreDb);
  assert.deepEqual(afterTests.rows, before.rows, 'pgTAP transaction은 복구 데이터 내용을 변경하지 않는다');
  sql(restoreDb, await readFile(`${root}scripts/rollback/20261012090000_restore_service_role_access.sql`, 'utf8'));
  const rolledBack = snapshot(restoreDb);
  assert.deepEqual(rolledBack.rows, afterTests.rows, '권한 rollback은 데이터를 변경하지 않는다');
  assert.equal(rolledBack.security.serviceRead, true);
  assert.equal(rolledBack.security.runtimeRead, false);
  assert.equal(rolledBack.security.runtimeWrite, false);
  sql(restoreDb, await readFile(`${root}supabase/migrations/20261012090000_transfer_teams_runtime_access.sql`, 'utf8'));
  assert.deepEqual(snapshot(restoreDb), afterTests, 'rollback 뒤 전용 역할 migration을 재적용할 수 있다');
  assert.deepEqual(snapshot('postgres'), before, '원본 개발 DB는 백업·복구 검증 중 변경하지 않는다');
  console.log(`development export/restore/role rollback: PASS (${tables.length} tables, data hashes, constraints, RLS, grants, sequence, ${tapTests} restored pgTAP tests)`);
} finally {
  // Drop only the DB successfully created by this invocation, never the source.
  if (created) docker(['exec', container, 'dropdb', '-U', 'postgres', restoreDb]);
}
