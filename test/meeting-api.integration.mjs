import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = process.env.CODY_STAT_SUPABASE_URL && process.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY
  ? ''
  : execFileSync(`${root}node_modules/.bin/supabase`, ['status', '-o', 'env'], { cwd: root, encoding: 'utf8' });
const local = process.env.CODY_STAT_SUPABASE_URL && process.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY
  ? { API_URL: process.env.CODY_STAT_SUPABASE_URL, SERVICE_ROLE_KEY: process.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY }
  : Object.fromEntries(output.split('\n').flatMap((line) => { const m = line.match(/^([A-Z_]+)=(.*)$/); return m ? [[m[1], m[2].replace(/^['"]|['"]$/g, '')]] : []; }));
assert.ok(local.API_URL && local.SERVICE_ROLE_KEY);
const client = createClient(local.API_URL, local.SERVICE_ROLE_KEY);
const base = 'http://127.0.0.1:4335';
const server = spawn(process.execPath, ['dist/server/entry.mjs'], { cwd: root, env: { ...process.env, HOST: '127.0.0.1', PORT: '4335', CODY_STAT_SUPABASE_URL: local.API_URL, CODY_STAT_SUPABASE_SERVICE_ROLE_KEY: local.SERVICE_ROLE_KEY }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; server.stdout.on('data', (c) => { log += c; }); server.stderr.on('data', (c) => { log += c; });
let id;
async function json(response) { assert.ok(response.ok, `HTTP ${response.status}`); return response.json(); }
async function save(data, query = '') { return fetch(`${base}/api/teams/meetings${query}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
try {
  let ready = false;
  for (let i = 0; i < 60; i++) { try { if ((await fetch(base)).ok) { ready = true; break; } } catch {} await new Promise((resolve) => setTimeout(resolve, 100)); }
  assert.ok(ready, '서버 준비');
  assert.equal((await fetch(`${base}/teams/meetings`)).status, 200);
  const initial = await json(await fetch(`${base}/api/teams/meetings`)); assert.ok(initial.notes.length >= 2);
  const data = { title: `통합 회의 ${Date.now()}`, date: '2026-09-15', content: '# 안전한 결정\n\n<script>evil()</script><img src=x onerror=evil()>\n\n[위험](javascript:evil())', status: 'draft', ticketIds: [initial.tickets[0].id] };
  assert.equal((await save(null)).status, 400);
  assert.equal((await save({ ...data, date: '2026-02-30' })).status, 400);
  const created = await json(await save(data)); id = created.note.id;
  assert.equal(created.note.tickets.length, 1);
  const page = await fetch(`${base}/teams/meetings/${id}`); assert.equal(page.status, 200);
  const html = await page.text();
  // Astro hydration props intentionally carry escaped raw input; inspect only rendered Markdown.
  const rendered = html.match(/class="rich-text mt-10"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  assert.ok(rendered); assert.match(rendered, /<h1>안전한 결정<\/h1>/); assert.doesNotMatch(rendered, /script|onerror|javascript:|<img/);
  assert.match(html, new RegExp(`/teams/tickets/${initial.tickets[0].number}`));
  const updated = await json(await save({ ...data, status: 'published', ticketIds: [] }, `?id=${id}`)); assert.equal(updated.note.status, 'published'); assert.equal(updated.note.tickets.length, 0);
  const comment = await json(await save({ body: '<b>일반 텍스트 의견</b>' }, `?id=${id}&action=comment`)); assert.ok(comment.comments.some((c) => c.body.includes('일반 텍스트 의견')));
  assert.equal((await save(null, `?id=${id}&action=comment`)).status, 400);
  const read = await json(await fetch(`${base}/api/teams/meetings?id=${id}`)); assert.equal(read.note.comments.length, 1);
  assert.equal((await fetch(`${base}/teams/meetings/ffffffff-ffff-ffff-ffff-ffffffffffff`)).status, 404);
  const remove = (value) => fetch(`${base}/api/teams/meetings?id=${value}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
  assert.equal((await remove('invalid')).status, 400);
  assert.equal((await remove('ffffffff-ffff-ffff-ffff-ffffffffffff')).status, 404);
  assert.equal((await remove(id)).status, 204);
  assert.equal((await fetch(`${base}/api/teams/meetings?id=${id}`)).status, 404);
  assert.equal((await fetch(`${base}/teams/meetings/${id}`)).status, 404);
  assert.ok(!(await json(await fetch(`${base}/api/teams/meetings`))).notes.some((note) => note.id === id));
  assert.equal((await remove(id)).status, 404);
  assert.equal((await save(data, `?id=${id}`)).status, 404);
  assert.equal((await save({ body: '삭제 후 댓글' }, `?id=${id}&action=comment`)).status, 404);
  const retained = await client.from('meeting_notes').select('deleted_at,content').eq('id', id).single();
  assert.ifError(retained.error); assert.ok(retained.data.deleted_at); assert.equal(retained.data.content, data.content);
  const comments = await client.from('meeting_comments').select('id').eq('meeting_note_id', id);
  assert.ifError(comments.error); assert.equal(comments.data.length, 1);
  console.log('meeting API create/update/comment/soft-delete and deleted-record protection: PASS');
} catch (error) { console.error(log.slice(-1500)); throw error; }
finally { if (id) await client.from('meeting_notes').delete().eq('id', id); server.kill('SIGTERM'); }
