import assert from 'node:assert/strict';
import test from 'node:test';
import { meetingInput, meetingPatch, meetingTicketDrafts } from '../src/features/teams/domain/meetings.ts';

const draft = { title: '  결정 구현  ', description: '  합의한 완료 조건  ', type: '기능 요청' };
test('새 티켓은 검토 가능한 필드만 받고 회의록과 합쳐 최대 개수를 검증한다', () => {
  assert.deepEqual(meetingTicketDrafts([draft]), [{ title: '결정 구현', description: '합의한 완료 조건', type: '기능 요청' }]);
  for (const input of [null, {}, [null], [{...draft, title: ''}], [{...draft, type: '관리자'}], [{...draft, id: 'spoof'}], Array(21).fill(draft)]) assert.throws(() => meetingTicketDrafts(input));
  assert.throws(() => meetingInput({ title: '회의', date: '2026-10-01', content: '', status: 'published', ticketIds: Array(100).fill('11111111-1111-1111-1111-111111111111'), newTickets: [draft] }));
});
test('부분 수정은 생략한 필드를 덮어쓰지 않고 명시된 빈 본문과 빈 연결 목록을 보존한다', () => {
  assert.deepEqual(meetingPatch({title: ' 새 제목 '}), {title: '새 제목'});
  assert.deepEqual(meetingPatch({content: '', ticketIds: []}), {content: '', ticketIds: []});
  for (const input of [{}, {id: 'spoof'}, {newTickets: [draft]}, {title: null}, {date: '2026-02-30'}, {status: null}, {content: 7}, {ticketIds: null}]) assert.throws(() => meetingPatch(input));
});
