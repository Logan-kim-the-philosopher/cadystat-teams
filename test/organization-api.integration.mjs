import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { localEnvironment, root, runtimeEnvironment } from './helpers/local-server.mjs';

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
const port = '4331';
const baseUrl = `http://127.0.0.1:${port}`;
let serverLog = '';
const server = spawn(process.execPath, ['dist/server/entry.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: port,
    ...runtimeEnvironment(local)
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', (chunk) => { serverLog += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverLog += chunk.toString(); });

let parentId;
let childId;
let deleteTicketTeamId;
let resetTicketNumber;

try {
  await waitForServer(baseUrl);
  const page = await fetch(`${baseUrl}/teams/organization`);
  const pageHtml = await page.text();
  assert.equal(page.status, 200);
  assert.match(pageHtml, /조직도/);
  assert.doesNotMatch(pageHtml, /함께 편집/);

  const endpoint = `${baseUrl}/api/teams/organization`;
  const ticketsEndpoint = `${baseUrl}/api/teams/tickets`;
  const ticketOptions = await json(await fetch(ticketsEndpoint));
  const ticketTypeId = ticketOptions.types[0]?.id;
  assert.ok(ticketTypeId);
  const initial = await json(await fetch(endpoint));
  assert.ok(initial.teams.length >= 4);
  const rootTeam = initial.teams.find((team) => team.parentTeamId === null);
  assert.ok(rootTeam);

  const invalid = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '' }) });
  assert.equal(invalid.status, 400);

  const suffix = Date.now().toString(36);
  const parent = await json(await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `통합 테스트 팀 ${suffix}`, parentTeamId: rootTeam.id, leadName: '통합 테스트 리드', leadTitle: 'Lead', leadGender: '' })
  }));
  parentId = parent.team.id;
  assert.equal(parent.team.members.length, 1);

  const child = await json(await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `통합 테스트 하위 팀 ${suffix}`, parentTeamId: parentId, leadName: '', leadTitle: '', leadGender: '' })
  }));
  childId = child.team.id;

  const blockedDelete = await fetch(`${endpoint}?id=${parentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  assert.equal(blockedDelete.status, 409, await blockedDelete.text());

  const lead = parent.team.members[0];
  const addedId = crypto.randomUUID();
  const updated = await json(await fetch(endpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamId: parentId,
      name: `통합 테스트 팀 수정 ${suffix}`,
      leadMemberId: lead.id,
      members: [
        { action: 'update', id: lead.id, name: lead.name, title: lead.title, gender: lead.gender, sortOrder: 0 },
        { action: 'create', id: addedId, name: '통합 테스트 구성원', title: 'Developer', gender: null, sortOrder: 1 }
      ]
    })
  }));
  assert.equal(updated.team.members.length, 2);

  const detail = await json(await fetch(`${endpoint}?id=${parentId}`));
  assert.equal(detail.team.name, `통합 테스트 팀 수정 ${suffix}`);
  assert.ok(detail.team.members.some((member) => member.id === addedId));

  assert.equal((await fetch(`${endpoint}?id=${childId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })).status, 204);
  childId = undefined;

  const resetTicket = await json(await fetch(ticketsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `팀 삭제 보존 티켓 ${suffix}`, description: '댓글과 이력을 보존합니다.', typeId: ticketTypeId, teamId: parentId, assigneeId: lead.id })
  }));
  resetTicketNumber = resetTicket.ticket.number;
  await json(await fetch(`${ticketsEndpoint}/${resetTicket.ticket.number}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: '통합 테스트', body: '보존할 댓글' })
  }));
  const resetPreview = await json(await fetch(`${endpoint}?id=${parentId}`));
  assert.equal(resetPreview.linkedTicketCount, 1);
  const missingAction = await fetch(`${endpoint}?id=${parentId}`, { method: 'DELETE' });
  assert.equal(missingAction.status, 409);
  assert.match((await missingAction.json()).error, /연결된 티켓/);

  const resetResponse = await fetch(`${endpoint}?id=${parentId}&ticketAction=reset`, { method: 'DELETE' });
  assert.equal(resetResponse.status, 204, await resetResponse.text());
  parentId = undefined;
  const resetDetail = await json(await fetch(`${ticketsEndpoint}/${resetTicket.ticket.number}`));
  assert.equal(resetDetail.ticket.teamId, null);
  assert.equal(resetDetail.ticket.assigneeId, null);
  assert.equal(resetDetail.ticket.status, '신규');
  assert.equal(resetDetail.ticket.comments.length, 1);
  assert.ok(resetDetail.ticket.history.some((entry) => entry.event === '팀 삭제로 신규 미배정 큐로 이동'));

  const deleteTeam = await json(await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `통합 테스트 삭제 팀 ${suffix}`, parentTeamId: rootTeam.id, leadName: '삭제 테스트 리드', leadTitle: 'Lead', leadGender: 'male' })
  }));
  deleteTicketTeamId = deleteTeam.team.id;
  const deleteTicket = await json(await fetch(ticketsEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `팀 삭제 영구 티켓 ${suffix}`, description: '삭제 시 함께 제거합니다.', typeId: ticketTypeId, teamId: deleteTicketTeamId, assigneeId: deleteTeam.team.members[0].id })
  }));
  await json(await fetch(`${ticketsEndpoint}/${deleteTicket.ticket.number}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: '통합 테스트', body: '함께 삭제할 댓글' })
  }));
  const deletePreview = await json(await fetch(`${endpoint}?id=${deleteTicketTeamId}`));
  assert.equal(deletePreview.linkedTicketCount, 1);
  const deleteResponse = await fetch(`${endpoint}?id=${deleteTicketTeamId}&ticketAction=delete`, { method: 'DELETE' });
  assert.equal(deleteResponse.status, 204, await deleteResponse.text());
  deleteTicketTeamId = undefined;
  assert.equal((await fetch(`${ticketsEndpoint}/${deleteTicket.ticket.number}`)).status, 404);
  assert.equal((await fetch(`${ticketsEndpoint}/${deleteTicket.ticket.number}/comments`)).status, 404);

  assert.equal((await fetch(`${endpoint}?id=${updated.team.id}`)).status, 404);
  console.log('organization API integration: PASS');
} catch (error) {
  console.error(serverLog.slice(-2000));
  throw error;
} finally {
  const endpoint = `${baseUrl}/api/teams/organization`;
  if (resetTicketNumber) await fetch(`${baseUrl}/api/teams/tickets/${resetTicketNumber}`, { method: 'DELETE' }).catch(() => undefined);
  if (childId) await fetch(`${endpoint}?id=${childId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }).catch(() => undefined);
  if (parentId) await fetch(`${endpoint}?id=${parentId}&ticketAction=delete`, { method: 'DELETE' }).catch(() => undefined);
  if (deleteTicketTeamId) await fetch(`${endpoint}?id=${deleteTicketTeamId}&ticketAction=delete`, { method: 'DELETE' }).catch(() => undefined);
  server.kill('SIGTERM');
}
