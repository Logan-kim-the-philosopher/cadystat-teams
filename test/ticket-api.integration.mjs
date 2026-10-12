import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const supabaseBin = fileURLToPath(new URL('../node_modules/.bin/supabase', import.meta.url));

function localEnvironment() {
  if (process.env.CODY_STAT_SUPABASE_URL && process.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY) {
    return { url: process.env.CODY_STAT_SUPABASE_URL, key: process.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY };
  }
  const output = execFileSync(supabaseBin, ['status', '-o', 'env'], { cwd: root, encoding: 'utf8' });
  const values = Object.fromEntries(output.split('\n').flatMap((line) => {
    const matched = line.match(/^([A-Z_]+)=(.*)$/);
    if (!matched) return [];
    return [[matched[1], matched[2].replace(/^['"]|['"]$/g, '')]];
  }));
  assert.ok(values.API_URL, 'local Supabase API_URL이 필요합니다.');
  assert.ok(values.SERVICE_ROLE_KEY, 'local Supabase SERVICE_ROLE_KEY가 필요합니다.');
  return { url: values.API_URL, key: values.SERVICE_ROLE_KEY };
}

async function waitForServer(baseUrl) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Astro test server가 준비되지 않았습니다.');
}

async function json(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
  return body;
}

const local = localEnvironment();
const port = '4333';
const baseUrl = `http://127.0.0.1:${port}`;
let serverLog = '';
const server = spawn(process.execPath, ['dist/server/entry.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: port,
    CODY_STAT_SUPABASE_URL: local.url,
    CODY_STAT_SUPABASE_SERVICE_ROLE_KEY: local.key
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });

let createdNumber;

try {
  await waitForServer(baseUrl);
  const page = await fetch(`${baseUrl}/teams/tickets`);
  const pageHtml = await page.text();
  assert.equal(page.status, 200);
  assert.match(pageHtml, /티켓/);
  assert.match(pageHtml, /함께 편집/);

  const endpoint = `${baseUrl}/api/teams/tickets`;
  const initial = await json(await fetch(endpoint));
  assert.ok(initial.tickets.length >= 4);
  assert.deepEqual(initial.statuses.map((item) => item.name), ['신규', '배정', '완료']);
  const type = initial.types[0];
  const otherType = initial.types[1] ?? type;
  const team = initial.teams.find((item) => item.members.length > 0);
  assert.ok(type && team);

  const invalid = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '', description: '', typeId: type.id })
  });
  assert.equal(invalid.status, 400);

  const suffix = Date.now().toString(36);
  const created = await json(await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `통합 티켓 ${suffix}`, description: '통합 상태 전이 검증', typeId: type.id, teamId: null, assigneeId: null })
  }));
  createdNumber = created.ticket.number;
  assert.equal(created.ticket.status, '신규');
  assert.equal(created.ticket.teamId, null);

  const detailEndpoint = `${endpoint}/${encodeURIComponent(createdNumber)}`;
  const createdDetail = await json(await fetch(detailEndpoint));
  assert.ok(createdDetail.ticket.history.some((entry) => entry.event === '접수됨'));

  const directComplete = await fetch(detailEndpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: created.ticket.title, description: created.ticket.description, typeId: type.id, teamId: null, assigneeId: null, status: '완료' })
  });
  assert.equal(directComplete.status, 409);

  const assigned = await json(await fetch(detailEndpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: created.ticket.title, description: created.ticket.description, typeId: type.id, teamId: team.id, assigneeId: team.members[0].id, status: '배정' })
  }));
  assert.equal(assigned.ticket.status, '배정');
  assert.equal(assigned.ticket.teamId, team.id);

  const commentEndpoint = `${detailEndpoint}/comments`;
  const comment = await json(await fetch(commentEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: '통합 테스트', body: '상태 전이 확인 완료' })
  }));
  assert.equal(comment.comment.body, '상태 전이 확인 완료');
  const comments = await json(await fetch(commentEndpoint));
  assert.ok(comments.comments.some((item) => item.id === comment.comment.id));

  const completed = await json(await fetch(detailEndpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `통합 티켓 수정 ${suffix}`, description: created.ticket.description, typeId: otherType.id, teamId: team.id, assigneeId: team.members[0].id, status: '완료' })
  }));
  assert.equal(completed.ticket.status, '완료');
  assert.equal(completed.ticket.title, `통합 티켓 수정 ${suffix}`);
  assert.ok(completed.ticket.history.some((entry) => entry.event.includes('완료')));

  const filtered = await json(await fetch(`${endpoint}?status=${encodeURIComponent('완료')}&teamId=${team.id}&q=${suffix}`));
  assert.equal(filtered.tickets.length, 1);
  assert.equal(filtered.tickets[0].number, createdNumber);

  const detailPage = await fetch(`${baseUrl}/teams/tickets/${encodeURIComponent(createdNumber)}`);
  assert.equal(detailPage.status, 200);
  assert.match(await detailPage.text(), new RegExp(`통합 티켓 수정 ${suffix}`));

  assert.equal((await fetch(detailEndpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })).status, 204);
  createdNumber = undefined;
  assert.equal((await fetch(detailEndpoint)).status, 404);

  console.log('ticket API integration: PASS');
} catch (error) {
  console.error(serverLog.slice(-2000));
  throw error;
} finally {
  if (createdNumber) {
    await fetch(`${baseUrl}/api/teams/tickets/${encodeURIComponent(createdNumber)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }).catch(() => undefined);
  }
  server.kill('SIGTERM');
}
