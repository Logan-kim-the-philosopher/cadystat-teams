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
  assert.match(shell, /href="\/teams\/meetings"/);
  assert.match(shell, /href=\{platformHome\}/);
  assert.match(shell, /Cody Stat/);
  assert.doesNotMatch(shell, />서비스</);
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

test('README links to an actionable data-separation runbook without authorizing production changes', async () => {
  const [readme, handoff, runbook, mapping, ssoContract] = await Promise.all([
    read('README.md'),
    read('docs/runbooks/teams-collaboration-handoff.md'),
    read('docs/runbooks/teams-data-separation.md'),
    read('docs/runbooks/teams-schema-mapping-draft.md'),
    read('docs/codyspace-sso-integration-contract.md')
  ]);
  assert.match(readme, /\[Teams 협업 착수 안내\]\(docs\/runbooks\/teams-collaboration-handoff\.md\)/);
  assert.match(readme, /\[Teams 데이터 분리 runbook\]\(docs\/runbooks\/teams-data-separation\.md\)/);
  assert.match(handoff, /첫 협의에서 확정할 항목/);
  assert.match(handoff, /운영 migration, 데이터 복사, cutover는 별도 승인 전까지 하지 않습니다/);
  assert.match(handoff, /`meeting_slug`/);
  assert.match(handoff, /별도 승인을 받습니다/);
  assert.match(handoff, /teams-data-separation\.md/);
  assert.match(handoff, /teams-schema-mapping-draft\.md/);
  assert.match(handoff, /codyspace-sso-integration-contract\.md/);
  assert.match(ssoContract, /연동 담당자 검토용 제안/);
  assert.match(readme, /현재 앱은 사용자 로그인을 직접 검증하지 않습니다/);
  assert.match(readme, /Astro origin에 Gateway를 우회해 직접 접근할 수 없게 해야 합니다/);
  assert.match(runbook, /전용 Supabase 프로젝트/);
  assert.match(runbook, /운영 DB migration 적용·데이터 복사·트래픽 전환을 승인하지 않습니다/);
  assert.match(runbook, /source에서 새 target으로 데이터를 옮기는 운영 복사 스크립트는 없습니다/);
  assert.match(runbook, /scripts\/rollback\/20261012090000_restore_service_role_access\.sql/);
  assert.match(runbook, /scripts\/teams-data-integrity\.sql/);
  assert.match(runbook, /스키마 매핑 초안/);
  assert.match(runbook, /legacy source에는 그대로 실행할 수 없습니다/);
  assert.match(mapping, /meeting_slug/);
  assert.match(mapping, /meeting_api_keys/);
  assert.match(mapping, /운영 담당자와 함께 확인할 사항/);
  assert.match(mapping, /meeting_note_id IS NULL/);
  assert.match(mapping, /운영 DB, 실제 migration history, 데이터, project ref에는 접속하지 않았습니다/);
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
