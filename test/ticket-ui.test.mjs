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
  assert.doesNotMatch(routes, /CODY_STAT_SUPABASE_SERVICE_ROLE_KEY|createClient|\.from\(/);
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
