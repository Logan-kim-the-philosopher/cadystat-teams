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
  assert.doesNotMatch(api, /CODY_STAT_SUPABASE_SERVICE_ROLE_KEY|createClient/);
});
