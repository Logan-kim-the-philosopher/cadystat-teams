import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const pages = [
  'src/pages/teams/meetings/index.astro',
  'src/pages/teams/meetings/[id].astro',
  'src/pages/teams/tickets/index.astro',
  'src/pages/teams/tickets/[ticketNumber].astro',
  'src/pages/teams/organization/index.astro',
  'src/pages/teams/organization/[id].astro'
];

test('every Teams page uses its own original-style shell', async () => {
  for (const page of pages) {
    const source = await read(page);
    assert.match(source, /TeamsLayout/, page);
    assert.doesNotMatch(source, /PlatformLayout/, page);
  }
  const shell = await read('src/layouts/TeamsLayout.astro');
  const tabs = await read('src/features/teams/components/header-tabs.tsx');
  assert.match(shell, /Codystat-Teams/);
  assert.match(shell, /HeaderTabs/);
  assert.match(shell, /lg:col-start-2 lg:row-start-1 lg:w-max lg:justify-self-center/);
  assert.doesNotMatch(shell, /lg:absolute/);
  assert.doesNotMatch(shell, /href="\/login"/);
  for (const path of ['/teams/meetings', '/teams/tickets', '/teams/organization']) assert.ok(tabs.includes(path));
});

test('meetings retain editorial presentation and namespaced data operations', async () => {
  const index = await read('src/pages/teams/meetings/index.astro');
  const detail = await read('src/pages/teams/meetings/[id].astro');
  const browser = await read('src/features/teams/components/meeting-browser.tsx');
  const thumbnail = await read('src/features/teams/components/meeting-editorial-thumbnail.tsx');
  assert.match(index, /bg-gradient-to-br/);
  assert.match(index, /RecentMeetingComments/);
  assert.match(await read('src/features/teams/components/recent-meeting-comments.tsx'), /최근 댓글/);
  assert.match(browser, /MeetingEditorialThumbnail/);
  assert.match(browser, /\/api\/teams\/meetings/);
  assert.match(detail, /MeetingComments/);
  assert.match(detail, /renderMarkdown/);
  assert.match(thumbnail, /Codystat \/ Meeting/);
});

test('organization and ticket views follow the original sheet and split-board composition', async () => {
  const [flow, teamNode, board, maleAvatar, femaleAvatar] = await Promise.all([
    read('src/features/teams/components/organization-flow.tsx'),
    read('src/features/teams/components/organization-team-node.tsx'),
    read('src/features/teams/components/ticket-board.tsx'),
    read('public/avatars/profile-male.svg'),
    read('public/avatars/profile-female.svg')
  ]);
  assert.match(flow, /resolveSheetLayout/);
  assert.match(flow, /reportsToMemberId/);
  assert.match(flow, /fitView=\{false\}/);
  assert.match(await read('src/pages/teams/index.astro'), /Astro\.redirect\('\/teams\/meetings'\)/);
  assert.match(teamNode, /members\.map/);
  assert.doesNotMatch(teamNode, /members\.slice/);
  assert.match(teamNode, /profile-\$\{member\.gender\}\.svg/);
  assert.match(maleAvatar, /<svg/);
  assert.match(femaleAvatar, /<svg/);
  assert.match(board, /lg:grid-cols-\[minmax\(0,0\.8fr\)_minmax\(0,2fr\)\]/);
  assert.match(board, /팀별 현황/);
  assert.match(board, /칸반보드/);
  assert.match(board, /티켓을 놓으세요/);
  assert.match(board, /\/api\/teams\/tickets/);
});
