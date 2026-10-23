import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('organization pages render DB data through the Teams feature boundary', async () => {
  const [indexPage, detailPage] = await Promise.all([
    read('src/pages/teams/organization/index.astro'),
    read('src/pages/teams/organization/[id].astro')
  ]);

  assert.match(indexPage, /listOrganization/);
  assert.match(indexPage, /OrganizationFlow client:load/);
  assert.match(detailPage, /getOrganizationTeam/);
  assert.doesNotMatch(`${indexPage}\n${detailPage}`, /site-data|orgUnits|teamDetails/);
});

test('organization UI uses the namespaced API and accessible editor dialogs', async () => {
  const [flow, editor, api] = await Promise.all([
    read('src/features/teams/components/organization-flow.tsx'),
    read('src/features/teams/components/organization-editor.tsx'),
    read('src/pages/api/teams/organization/index.ts')
  ]);

  assert.match(`${flow}\n${editor}`, /\/api\/teams\/organization/);
  assert.match(flow, /aria-modal="true"/);
  assert.match(api, /OrganizationRepositoryError/);
  assert.match(flow, /연결된 티켓 \{teamDeletePrompt\.ticketCount\}개/);
  assert.match(flow, /팀과 연결된 티켓/);
  assert.match(flow, /executeTeamDeletion\(teamDeletePrompt\.unit, 'delete'\)/);
  assert.match(flow, /executeTeamDeletion\(teamDeletePrompt\.unit, 'reset'\)/);
  assert.match(flow, /기존 이력은 보존하고 팀 삭제 이력을 추가합니다/);
  assert.match(api, /ticketAction/);
  assert.match(api, /linkedTicketCount/);
  assert.doesNotMatch(api, /TEAMS_SUPABASE_ACCESS_TOKEN|createClient/);
});
