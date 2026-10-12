import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { issueMeetingApiKey, revokeMeetingApiKey } from '../src/lib/server/meeting-api-keys.mjs';
import { localEnvironment, startServer } from './helpers/local-server.mjs';
const local = localEnvironment();
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(local.url).hostname));
const db = createClient(local.url, local.key);
const server = await startServer(4351, local);
const keys = [], notes = [], tickets = [];
const title = `피드백 통합 ${randomUUID()}`;
const payload = { title, date: '2026-10-01', content: '# 원문\r\n```mermaid\nflowchart LR\nA-->B\n```', newTickets: [{ title: `${title} 티켓`, description: '회의에서 정한 일', type: '기능 요청' }] };
const req = (path, method='GET', body, key, requestId=randomUUID()) => fetch(`${server.base}${path}`, { method, headers: { 'Content-Type':'application/json', ...(key ? {Authorization:`Bearer ${key}`} : {}), 'Idempotency-Key':requestId }, ...(body !== undefined ? {body:JSON.stringify(body)} : {}) });
async function check(response, status, code) {
  assert.equal(response.status,status,await response.clone().text());
  const result = status === 204 ? null : await response.json();
  if (code) assert.equal(result.error.code,code);
  return result;
}
async function readNote(id) { return (await check(await req(`/api/teams/meetings?id=${id}`),200)).note; }
async function collect(id) { notes.push(id); const note=await readNote(id); tickets.push(...note.tickets.map(t=>t.id)); return note; }
try {
  const a=await issueMeetingApiKey(db,'피드백 검증 A',1), b=await issueMeetingApiKey(db,'피드백 검증 B',1); keys.push(a.id,b.id);
  const uploadId=randomUUID();
  const created=await check(await req('/api/v1/meetings','POST',payload,a.key,uploadId),201);
  const id=created.meeting.id, path=`/api/v1/meetings/${id}`;
  const original=await collect(id); assert.equal(original.tickets.length,1); assert.equal(original.content,payload.content);
  await check(await req('/api/v1/meetings','POST',payload,a.key,uploadId),200);
  assert.equal((await readNote(id)).tickets.length,1,'재시도는 티켓도 중복 생성하지 않는다');
  await check(await req(path,'PATCH',{title:'unauth'}),401,'invalid_api_key');
  await check(await req(path,'PATCH',{title:'other'},b.key),404,'meeting_not_found');
  await check(await req(path,'DELETE',undefined,b.key),404,'meeting_not_found');
  const web=(await check(await req('/api/teams/meetings','POST',{...payload,title:`${title} 웹`,status:'published',ticketIds:[]}),201)).note; await collect(web.id);
  await check(await req(`/api/v1/meetings/${web.id}`,'PATCH',{title:'steal'},a.key),404,'meeting_not_found');
  await check(await req(path,'PATCH',{},a.key),400,'invalid_request');
  await check(await req(path,'PATCH',{newTickets:payload.newTickets},a.key),400,'invalid_request');
  await check(await req(path,'PATCH',{date:'2026-02-30'},a.key),400,'invalid_request');
  await check(await req(path,'PATCH',{ticketIds:[randomUUID()]},a.key),400,'invalid_request');
  const patchId=randomUUID(), patch={title:`${title} 수정`};
  const concurrent=await Promise.all(Array.from({length:3},()=>req(path,'PATCH',patch,a.key,patchId)));
  const mutations=await Promise.all(concurrent.map(r=>check(r,200)));
  assert.equal(mutations.filter(r=>!r.replayed).length,1);
  const updated=await readNote(id); assert.equal(updated.title,patch.title); assert.equal(updated.content,payload.content); assert.deepEqual(updated.tickets,original.tickets);
  await check(await req(path,'PATCH',{content:'새 본문'},a.key,patchId),409,'idempotency_conflict');
  await check(await req(path,'PATCH',{content:'최신 본문'},a.key),200);
  await check(await req(path,'PATCH',patch,a.key,patchId),200);
  assert.equal((await readNote(id)).content,'최신 본문','과거 요청 재전송은 최신 변경을 되돌리지 않는다');
  const comment=(await check(await req(`/api/teams/meetings?id=${id}&action=comment`,'POST',{body:`최근 댓글 ${title} <script>plain</script>`}),201)).comments[0];
  let recent=(await check(await req('/api/teams/meetings?action=recent-comments'),200)).comments;
  assert.ok(recent.some(c=>c.id===comment.id && c.meetingId===id && c.meetingTitle===patch.title));
  const page=await (await req('/teams/meetings')).text(); assert.ok(page.includes(`#comment-${comment.id}`));
  const anchor=await (await req(`/teams/meetings/${id}`)).text(); assert.ok(anchor.includes(`id="comment-${comment.id}"`));
  await check(await req(`/api/teams/meetings?id=${web.id}&action=comment&commentId=${comment.id}`,'DELETE'),404);
  await check(await req(`/api/teams/meetings?id=${id}&action=comment&commentId=${comment.id}`,'DELETE'),204);
  recent=(await check(await req('/api/teams/meetings?action=recent-comments'),200)).comments; assert.ok(!recent.some(c=>c.id===comment.id));
  await check(await req(`/api/teams/meetings?id=${id}&action=comment&commentId=${comment.id}`,'DELETE'),404);
  const rollbackTitle=`${title} rollback`;
  const failed=await db.rpc('save_meeting_with_tickets',{p_title:rollbackTitle,p_meeting_date:'2026-10-01',p_content:'',p_status:'published',p_new_tickets:[{title:rollbackTitle,description:'valid',type:'기능 요청'},{title:'invalid',description:'',type:'기능 요청'}]});
  assert.ok(failed.error);
  for (const table of ['meeting_notes','tickets']) { const rows=await db.from(table).select('id').eq('title',rollbackTitle); assert.ifError(rows.error); assert.equal(rows.data.length,0,'저장 실패 시 회의록과 티켓 전체 롤백'); }
  const expire=await db.from('meeting_api_keys').update({expires_at:new Date(Date.now()-1000).toISOString()}).eq('id',b.id); assert.ifError(expire.error);
  await check(await req(path,'DELETE',undefined,b.key),401,'invalid_api_key');
  await check(await req(path,'DELETE',{},a.key),400,'invalid_request');
  await check(await req(`/api/teams/meetings?id=${id}&action=wrong-comment`,'DELETE'),400);
  assert.equal((await readNote(id)).title,patch.title);
  const deleteId=randomUUID();
  await check(await req(path,'DELETE',undefined,a.key,deleteId),204);
  await check(await req(path,'DELETE',undefined,a.key,deleteId),204);
  await check(await req(path,'DELETE',undefined,a.key),204);
  await check(await req(path,'PATCH',{title:'restore'},a.key),404,'meeting_not_found');
  await check(await req(path,'PATCH',patch,a.key,patchId),409,'meeting_deleted');
  await check(await req(`/api/teams/meetings?id=${id}`),404);
  const retained=await db.from('meeting_notes').select('deleted_at,content').eq('id',id).single(); assert.ifError(retained.error); assert.ok(retained.data.deleted_at); assert.equal(retained.data.content,'최신 본문');
  await revokeMeetingApiKey(db,a.id);
  await check(await req(path,'DELETE',undefined,a.key),401,'invalid_api_key');
  const redirect=await fetch(`${server.base}/teams`,{redirect:'manual'}); assert.equal(redirect.status,302); assert.equal(redirect.headers.get('location'),'/teams/meetings');
  console.log('회의록 피드백: 원자적 티켓 생성·재시도, 키 소유권/만료/폐기, 부분 수정/삭제, 최근 댓글/삭제/링크, Teams 진입 PASS');
} finally {
  for (const id of notes) await db.from('meeting_notes').delete().eq('id',id);
  for (const id of tickets) await db.from('tickets').delete().eq('id',id);
  for (const id of keys) await db.from('meeting_api_keys').delete().eq('id',id);
  server.stop();
}
