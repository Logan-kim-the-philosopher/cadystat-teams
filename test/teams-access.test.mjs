import assert from 'node:assert/strict';
import test from 'node:test';
import { isCrossOriginTeamsMutation, teamsSurface } from '../src/lib/server/teams-access.ts';

test('Teams path protection matches only complete segments, including encoded slashes', () => {
  for (const path of ['/teams', '/teams/', '/teams/tickets', '/teams%2Ftickets']) assert.equal(teamsSurface(path), 'page', path);
  for (const path of ['/api/teams', '/api/teams/', '/api/teams/tickets', '/api/teams%2Ftickets']) assert.equal(teamsSurface(path), 'api', path);
  for (const path of ['/', '/teams-public', '/api/teamshop', '/healthz']) assert.equal(teamsSurface(path), null, path);
});

test('public editing allows same-origin and direct requests but rejects cross-origin writes', () => {
  const url = 'https://cody.example/api/teams/meetings';
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    assert.equal(isCrossOriginTeamsMutation(new Request(url, { method })), false);
    assert.equal(isCrossOriginTeamsMutation(new Request(url, { method, headers: { origin: 'https://cody.example' } })), false);
    assert.equal(isCrossOriginTeamsMutation(new Request(url, { method, headers: { origin: 'https://other.example' } })), true);
    assert.equal(isCrossOriginTeamsMutation(new Request(url, { method, headers: { origin: 'null' } })), true);
  }
  assert.equal(isCrossOriginTeamsMutation(new Request(url, { headers: { origin: 'https://other.example' } })), false);
});
