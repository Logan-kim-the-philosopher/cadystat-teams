import assert from 'node:assert/strict';
import { localEnvironment, runtimeClient, startServer } from './helpers/local-server.mjs';

const local = localEnvironment();
const client = runtimeClient(local);
const { base, stop } = await startServer(4336, local);
let latest;
let previousValue;

try {
  const lookup = await client.from('meeting_notes').select('id,next_meeting_at')
    .eq('status', 'published').is('deleted_at', null)
    .order('meeting_date', { ascending: false }).order('created_at', { ascending: false }).limit(1).single();
  assert.ifError(lookup.error);
  latest = lookup.data;
  previousValue = latest.next_meeting_at;

  const initial = await fetch(`${base}/api/teams/meeting-schedule`);
  assert.equal(initial.status, 200);
  assert.equal((await initial.json()).starts_at, previousValue);
  assert.equal((await fetch(`${base}/teams/meetings`)).status, 200);

  const invalid = await fetch(`${base}/api/teams/meeting-schedule`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ starts_at: '2026-02-30T05:00:00Z' })
  });
  assert.equal(invalid.status, 400);
  const valid = await fetch(`${base}/api/teams/meeting-schedule`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ starts_at: '2030-09-12T05:00:00Z' })
  });
  assert.equal(valid.status, 200);
  const saved = await valid.json();
  assert.equal(new Date(saved.starts_at).toISOString(), '2030-09-12T05:00:00.000Z');

  const persisted = await client.from('meeting_notes').select('next_meeting_at').eq('id', latest.id).single();
  assert.ifError(persisted.error);
  assert.equal(persisted.data.next_meeting_at, saved.starts_at);
  console.log('next meeting schedule GET/PATCH, validation, page render and persistence: PASS');
} finally {
  if (latest) await client.from('meeting_notes').update({ next_meeting_at: previousValue }).eq('id', latest.id);
  stop();
}
