import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('next meeting schedule uses the latest published, non-deleted meeting and a namespaced API', async () => {
  const [page, api, repository, migration, domain] = await Promise.all([
    read('src/pages/teams/meetings/index.astro'),
    read('src/pages/api/teams/meeting-schedule.ts'),
    read('src/features/teams/server/meeting-repository.ts'),
    read('supabase/migrations/20261013090000_add_next_meeting_schedule.sql'),
    read('src/features/teams/domain/meetings.ts')
  ]);

  assert.match(page, /NextMeetingBadge client:load initialValue=\{nextMeeting\}/);
  assert.match(api, /meetingScheduleInput/);
  assert.match(api, /getNextMeetingSchedule,.*saveNextMeetingSchedule/s);
  assert.match(repository, /eq\('status', 'published'\)\.is\('deleted_at', null\)/);
  assert.match(repository, /next_meeting_at: startsAt/);
  assert.match(migration, /add column next_meeting_at timestamptz/i);
  assert.match(domain, /!\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}T/);
});

test('next meeting picker preserves local time and restricts time choices to 14:00–17:00', async () => {
  const component = await read('src/features/teams/components/next-meeting-badge.tsx');

  assert.match(component, /function toLocalInput/);
  assert.match(component, /new Date\(`\$\{dateValue\}T12:00:00`\)/);
  assert.match(component, /Array\.from\(\{ length: 7 \}/);
  assert.match(component, /14 \+ Math\.floor\(index \/ 2\)/);
  assert.match(component, /disabled=\{saving \|\| !selectedDate \|\| !times\.includes\(selectedTime\)\}/);
  assert.match(component, /fetch\('\/api\/teams\/meeting-schedule'/);
});
