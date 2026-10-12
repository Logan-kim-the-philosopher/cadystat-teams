import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { hashMeetingApiKey, issueMeetingApiKey, revokeMeetingApiKey } from '../src/lib/server/meeting-api-keys.mjs';
import { localEnvironment, root, startServer } from './helpers/local-server.mjs';

const local = localEnvironment();
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(local.url).hostname));
const client = createClient(local.url, local.key);
const server = await startServer(4347, local);
const keys = [];
const body = { title: `에이전트 업로드 검증 ${randomUUID()}`, date: '2026-09-29', content: '# 결정 사항\n\n- 업로드 확인\n\n<script>evil()</script>' };
const command = (args) => execFileSync(process.execPath, ['scripts/meeting-api-keys.mjs', ...args], {
  cwd: root, encoding: 'utf8', env: { ...process.env, CODY_STAT_SUPABASE_URL: local.url, CODY_STAT_SUPABASE_SERVICE_ROLE_KEY: local.key }, stdio: ['ignore', 'pipe', 'pipe']
});
function upload(key, input = body, requestId = randomUUID(), options = {}) {
  return fetch(`${server.base}/api/v1/meetings${options.query ?? ''}`, {
    method: 'POST', headers: {
      'Content-Type': 'application/json', 'Idempotency-Key': requestId,
      ...(key ? { Authorization: `Bearer ${key}` } : {}), ...options.headers
    }, body: JSON.stringify(input)
  });
}
async function status(response, expected, code) {
  assert.equal(response.status, expected);
  const json = await response.json();
  if (code) assert.equal(json.error.code, code);
  return json;
}
try {
  const issued = JSON.parse(command(['issue', '--name', '로컬 업로드 통합 검증', '--days', '1']));
  keys.push(issued.id);
  const listed = command(['list']);
  assert.ok(!listed.includes(issued.key)); assert.ok(!listed.includes(hashMeetingApiKey(issued.key)));
  assert.ok(JSON.parse(listed).some((key) => key.id === issued.id));
  const record = await client.from('meeting_api_keys').select('*').eq('id', issued.id).single();
  assert.ifError(record.error);
  assert.equal(record.data.key_hash, hashMeetingApiKey(issued.key));
  assert.ok(!JSON.stringify(record.data).includes(issued.key));

  await status(await upload(), 401, 'invalid_api_key');
  await status(await upload(`cst_mk_${randomBytes(32).toString('base64url')}`), 401, 'invalid_api_key');
  await status(await upload(null, body, randomUUID(), { query: `?api_key=${issued.key}` }), 401, 'invalid_api_key');
  await status(await upload(issued.key, body, ''), 400, 'invalid_request');
  await status(await upload(issued.key, body, randomUUID(), { query: '?id=edit' }), 400, 'invalid_request');
  await status(await upload(issued.key, { ...body, id: randomUUID() }), 400, 'invalid_request');
  await status(await upload(issued.key, { ...body, date: '2026-02-30' }), 400, 'invalid_request');
  await status(await upload(issued.key, { ...body, content: 'x'.repeat(50001) }), 400, 'invalid_request');
  await status(await upload(issued.key, { ...body, content: 'x'.repeat(600000) }), 413, 'invalid_request');
  await status(await upload(issued.key, { ...body, ticketIds: [randomUUID()] }), 400, 'invalid_request');
  // Astro rejects simple-content cross-origin requests before the route. Use the
  // same origin here to exercise the route's JSON-only contract itself.
  await status(await upload(issued.key, body, randomUUID(), { headers: { 'Content-Type': 'text/plain', Origin: server.base } }), 415, 'invalid_request');
  for (const method of ['PUT', 'PATCH', 'DELETE']) {
    const response = await fetch(`${server.base}/api/v1/meetings`, { method, headers: { 'Content-Type': 'application/json' } });
    assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'GET, POST, OPTIONS');
  }

  const requestId = randomUUID();
  const results = await Promise.all(Array.from({ length: 5 }, () => upload(issued.key, body, requestId)));
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 200, 200, 200, 201]);
  const values = await Promise.all(results.map((r) => r.json()));
  const created = values.find((v) => !v.replayed);
  assert.equal(new Set(values.map((v) => v.meeting.id)).size, 1, '동시 재시도는 하나만 생성한다');
  assert.equal(created.meeting.path, `/teams/meetings/${created.meeting.id}`);
  assert.equal(results[0].headers.get('location'), created.meeting.path);
  assert.equal(results[0].headers.get('cache-control'), 'no-store');
  await status(await upload(issued.key, { ...body, title: '다른 내용' }, requestId), 409, 'idempotency_conflict');
  const read = await fetch(`${server.base}/api/teams/meetings?id=${created.meeting.id}`);
  const note = (await read.json()).note;
  assert.equal(note.content, body.content); assert.equal(note.status, 'published'); assert.equal(note.tickets.length, 0);
  const page = await fetch(server.base + created.meeting.path); assert.equal(page.status, 200);
  const rendered = (await page.text()).match(/class="rich-text mt-10"[^>]*>([\s\S]*?)<\/div>/)?.[1];
  assert.ok(rendered); assert.doesNotMatch(rendered, /<script>/);
  const attempts = await client.from('meeting_api_uploads').select('*').eq('api_key_id', issued.id);
  assert.ifError(attempts.error); assert.equal(attempts.data.length, 1);
  assert.ok(!JSON.stringify(attempts.data).includes(issued.key));

  // Distinct keys have independent retry namespaces.
  const second = await issueMeetingApiKey(client, '다른 로컬 에이전트', 1); keys.push(second.id);
  const independent = await status(await upload(second.key, body, requestId), 201);
  assert.notEqual(independent.meeting.id, created.meeting.id);
  const cap = await client.from('meeting_api_keys').update({ window_started_at: new Date().toISOString(), window_count: 60 }).eq('id', second.id);
  assert.ifError(cap.error);
  const limited = await upload(second.key);
  assert.equal(limited.headers.get('retry-after'), '60');
  await status(limited, 429, 'rate_limited');
  const reset = await client.from('meeting_api_keys').update({ window_started_at: new Date(Date.now() - 61000).toISOString() }).eq('id', second.id);
  assert.ifError(reset.error);
  await status(await upload(second.key, body, requestId), 200);
  assert.ifError((await client.from('meeting_api_keys').update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', second.id)).error);
  await status(await upload(second.key), 401, 'invalid_api_key');

  // Existing anonymous web mutations remain available, per release policy.
  const deleted = await fetch(`${server.base}/api/teams/meetings?id=${created.meeting.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
  assert.equal(deleted.status, 204);
  await status(await upload(issued.key, body, requestId), 409, 'meeting_deleted');
  const revoked = JSON.parse(command(['revoke', issued.id])); assert.equal(revoked.revoked, true);
  await status(await upload(issued.key), 401, 'invalid_api_key');
  const rpc = await client.rpc('create_agent_meeting', {
    p_key_hash: hashMeetingApiKey(issued.key), p_request_id: randomUUID(), p_payload_hash: 'a'.repeat(64),
    p_title: body.title, p_meeting_date: body.date, p_content: body.content, p_status: 'published'
  });
  assert.ifError(rpc.error); assert.equal(rpc.data.error, 'invalid_api_key', 'DB 함수도 폐기를 다시 검사한다');
  await revokeMeetingApiKey(client, second.id);
  console.log('meeting upload: key issue/list/revoke, missing/wrong/expired/revoked auth, input/size/methods, concurrent retry, conflict, rate limit, Markdown and public web policy PASS');
} finally {
  try {
    if (keys.length) {
      const records = await client.from('meeting_api_uploads').select('meeting_note_id').in('api_key_id', keys);
      assert.ifError(records.error);
      const ids = records.data.map((row) => row.meeting_note_id).filter(Boolean);
      if (ids.length) assert.ifError((await client.from('meeting_notes').delete().in('id', ids)).error);
      assert.ifError((await client.from('meeting_api_keys').delete().in('id', keys)).error);
    }
  } finally { server.stop(); }
}
