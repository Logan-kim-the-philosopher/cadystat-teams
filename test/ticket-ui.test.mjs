import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ticket pages render database records through the Teams feature boundary', async () => {
  const [indexPage, detailPage, board] = await Promise.all([
    read('src/pages/teams/tickets/index.astro'),
    read('src/pages/teams/tickets/[ticketNumber].astro'),
    read('src/features/teams/components/ticket-board.tsx')
  ]);

  assert.match(indexPage, /listTickets/);
  assert.match(indexPage, /TicketBoard client:load/);
  assert.match(detailPage, /getTicket/);
  assert.match(board, /\/api\/teams\/tickets/);
  assert.doesNotMatch(`${indexPage}\n${detailPage}\n${board}`, /site-data|ticketDetails|\/api\/tickets(?:['"?])/);
});

test('ticket APIs delegate to the repository and keep credentials behind the server client', async () => {
  const [indexApi, detailApi, commentsApi] = await Promise.all([
    read('src/pages/api/teams/tickets/index.ts'),
    read('src/pages/api/teams/tickets/[ticketNumber]/index.ts'),
    read('src/pages/api/teams/tickets/[ticketNumber]/comments.ts')
  ]);
  const routes = `${indexApi}\n${detailApi}\n${commentsApi}`;

  assert.match(routes, /ticket-repository/);
  assert.match(routes, /ticketErrorResponse/);
  assert.doesNotMatch(routes, /TEAMS_SUPABASE_ACCESS_TOKEN|createClient|\.from\(/);
});

test('ticket editor and detail expose accessible dialogs and normalized statuses', async () => {
  const [editor, detail, domain] = await Promise.all([
    read('src/features/teams/components/ticket-editor.tsx'),
    read('src/features/teams/components/ticket-detail.tsx'),
    read('src/features/teams/domain/tickets.ts')
  ]);

  assert.match(editor, /DialogContent/);
  assert.match(detail, /DialogContent/);
  assert.match(domain, /\['신규', '배정', '완료'\]/);
  assert.doesNotMatch(`${editor}\n${detail}`, /진행 중|보류|담당 배정/);
});

test('ticket board sorts by latest activity and uses the check icon for completion', async () => {
  const [board, detail] = await Promise.all([
    read('src/features/teams/components/ticket-board.tsx'),
    read('src/features/teams/components/ticket-detail.tsx')
  ]);

  assert.match(board, /incomingTickets = React\.useMemo/);
  assert.match(board, /updatedAt \|\| left\.createdAt/);
  assert.match(board, /updatedAt \|\| right\.createdAt/);
  assert.match(board, /filter\(\(ticket\) => ticket\.status === '신규' && !ticket\.teamId\)/);
  assert.match(detail, /import \{ Check,/);
  assert.match(detail, /<Check size=\{15\} className="mr-1" \/>완료 처리/);
});
