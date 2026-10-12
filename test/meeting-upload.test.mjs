import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { hashMeetingApiKey, meetingApiKeyHashFromHeader, issueMeetingApiKey } from '../src/lib/server/meeting-api-keys.mjs';
import { readLimitedJson } from '../src/lib/server/limited-json.ts';

test('업로드 인증은 Bearer 헤더의 전용 키만 받는다', () => {
  const key = `cst_mk_${randomBytes(32).toString('base64url')}`;
  assert.equal(meetingApiKeyHashFromHeader(`Bearer ${key}`), hashMeetingApiKey(key));
  assert.equal(meetingApiKeyHashFromHeader(`bearer ${key}`), hashMeetingApiKey(key));
  for (const header of [null, '', key, `Basic ${key}`, `Bearer ${key}, Bearer ${key}`, `Bearer ${key} extra`, 'Bearer not-a-meeting-key']) {
    assert.equal(meetingApiKeyHashFromHeader(header), null);
  }
});

test('키 발급 입력 오류는 DB 접근 전에 거부한다', async () => {
  for (const [name, days] of [['', 90], ['x'.repeat(81), 90], ['agent', 0], ['agent', 366], ['agent', 1.5], ['agent', NaN]]) {
    await assert.rejects(issueMeetingApiKey(null, name, days));
  }
});

test('JSON 본문은 선언 길이가 없어도 실제 스트림 크기를 제한한다', async () => {
  let canceled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(10)); controller.enqueue(new Uint8Array(10)); },
    cancel() { canceled = true; }
  });
  const request = new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half' });
  await assert.rejects(readLimitedJson(request, 15), { status: 413 });
  assert.equal(canceled, true);
});

test('JSON 형식·미디어 타입·UTF-8 오류를 구분하고 한국어를 읽는다', async () => {
  const request = (body, contentType = 'application/json') => new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': contentType }, body });
  assert.deepEqual(await readLimitedJson(request('{"제목":"회의"}', 'application/json; charset=utf-8'), 100), { 제목: '회의' });
  await assert.rejects(readLimitedJson(request('{}', 'text/plain'), 100), { status: 415 });
  await assert.rejects(readLimitedJson(request('{'), 100), { status: 400 });
  await assert.rejects(readLimitedJson(request(new Uint8Array([0xff])), 100), { status: 400 });
});
