import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { issueMeetingApiKey, setMeetingApiKeyRole, revokeMeetingApiKey } from '../src/lib/server/meeting-api-keys.mjs';
import { localEnvironment, startServer } from './helpers/local-server.mjs';
const local=localEnvironment();assert.ok(['localhost','127.0.0.1'].includes(new URL(local.url).hostname));
const db=createClient(local.url,local.key);const server=await startServer(4352,local);
const keys=[],notes=[],tickets=[];const prefix=`admin-test-${randomUUID()}`;
const req=(path,method='GET',body,key,requestId=randomUUID())=>fetch(server.base+path,{method,headers:{'Content-Type':'application/json',...(key?{Authorization:`Bearer ${key}`} : {}),'Idempotency-Key':requestId},...(body===undefined?{}:{body:JSON.stringify(body)})});
async function check(response,status,code){assert.equal(response.status,status,await response.clone().text());const body=status===204?null:await response.json();if(code)assert.equal(body.error.code,code);return body;}
async function issue(name){const key=await issueMeetingApiKey(db,name,1);keys.push(key.id);return key;}
async function createMeeting(key,title){const data=await check(await req('/api/v1/meetings','POST',{title,date:'2026-10-01',content:'source'},key),201);notes.push(data.meeting.id);return data.meeting.id;}
async function resetRate(id){const r=await db.from('meeting_api_keys').update({window_count:0,window_started_at:new Date().toISOString()}).eq('id',id);assert.ifError(r.error);}
try{
 const writer=await issue(prefix+' writer'),manager=await issue(prefix+' manager'),other=await issue(prefix+' other');
 const before=await db.from('meeting_api_keys').select('key_hash,expires_at,revoked_at').eq('id',manager.id).single();assert.ifError(before.error);
 await setMeetingApiKeyRole(db,manager.id,'teams_admin');
 const after=await db.from('meeting_api_keys').select('key_hash,expires_at,revoked_at').eq('id',manager.id).single();assert.deepEqual(after.data,before.data);
 const events=await db.from('meeting_api_key_role_events').select('previous_role,next_role').eq('api_key_id',manager.id);assert.deepEqual(events.data,[{previous_role:'writer',next_role:'teams_admin'}]);
 for(const [path,allow] of [['/api/v1/meetings','GET, POST, OPTIONS'],['/api/v1/meetings/'+randomUUID(),'GET, PATCH, DELETE, OPTIONS'],['/api/v1/tickets','GET, POST, OPTIONS'],['/api/v1/tickets/T-1000','GET, PATCH, DELETE, OPTIONS'],['/api/v1/me','GET, OPTIONS'],['/api/v1/tickets/options','GET, OPTIONS']]){
   const r=await req(path,'OPTIONS');assert.equal(r.status,204);assert.equal(r.headers.get('allow'),allow);assert.equal(r.headers.get('access-control-allow-origin'),null);
   await check(await req(path),401,'invalid_api_key');
 }
 const identity=await check(await req('/api/v1/me','GET',undefined,manager.key),200);assert.equal(identity.key.role,'teams_admin');assert.equal(identity.permissions.meetings.delete,'all');assert.equal(identity.permissions.manageKeys,false);assert.ok(!JSON.stringify(identity).includes('key_hash'));assert.ok(!JSON.stringify(identity).includes(manager.key));
 const writerMe=await check(await req('/api/v1/me','GET',undefined,writer.key),200);assert.equal(writerMe.permissions.meetings.read,'own');assert.equal(writerMe.permissions.tickets.read,false);
 const own=await createMeeting(writer.key,prefix+' own');const foreign=await createMeeting(other.key,prefix+' foreign');
 const web=await check(await req('/api/teams/meetings','POST',{title:prefix+' web',date:'2026-10-01',content:'web',status:'published',ticketIds:[]}),201);notes.push(web.note.id);
 const ownList=await check(await req(`/api/v1/meetings?q=${prefix}`,'GET',undefined,writer.key),200);assert.deepEqual(ownList.meetings.map(n=>n.id),[own]);
 await check(await req(`/api/v1/meetings/${foreign}`,'GET',undefined,writer.key),404);
 await check(await req(`/api/v1/meetings/${web.note.id}`,'DELETE',undefined,writer.key),404);
 const page1=await check(await req(`/api/v1/meetings?q=${prefix}&limit=2`,'GET',undefined,manager.key),200);assert.equal(page1.meetings.length,2);assert.equal(page1.pagination.nextOffset,2);
 const page2=await check(await req(`/api/v1/meetings?q=${prefix}&limit=2&offset=2`,'GET',undefined,manager.key),200);assert.equal(page2.meetings.length,1);assert.equal(new Set([...page1.meetings,...page2.meetings].map(n=>n.id)).size,3);
 const detail=await check(await req(`/api/v1/meetings/${web.note.id}`,'GET',undefined,manager.key),200);assert.equal(detail.meeting.content,'web');
 const mutationId=randomUUID();await check(await req(`/api/v1/meetings/${web.note.id}`,'PATCH',{title:prefix+' managed'},manager.key,mutationId),200);
 await check(await req(`/api/v1/meetings/${foreign}`,'DELETE',undefined,manager.key),204);
 await check(await req(`/api/v1/meetings/${foreign}`,'GET',undefined,manager.key),404);
 await setMeetingApiKeyRole(db,manager.id,'writer');await check(await req(`/api/v1/meetings/${web.note.id}`,'PATCH',{title:prefix+' managed'},manager.key,mutationId),404);
 await setMeetingApiKeyRole(db,manager.id,'teams_admin');
 for(const path of ['/api/v1/tickets','/api/v1/tickets/options','/api/v1/tickets/T-1000'])await check(await req(path,'GET',undefined,writer.key),403);
 const options=await check(await req('/api/v1/tickets/options','GET',undefined,manager.key),200);assert.ok(options.types.length);assert.ok(options.teams.length);
 const payload={title:prefix+' ticket',description:'ticket details',typeId:options.types[0].id};const createId=randomUUID();
 const created=await check(await req('/api/v1/tickets','POST',payload,manager.key,createId),201);tickets.push(created.ticket.id);const number=created.ticket.number;const path='/api/v1/tickets/'+number;
 const replay=await check(await req('/api/v1/tickets','POST',payload,manager.key,createId),200);assert.equal(replay.replayed,true);assert.equal(replay.ticket.number,number);
 await check(await req('/api/v1/tickets','POST',{...payload,role:'teams_admin'},manager.key),400);
 await check(await req(path,'PATCH',{status:'완료'},manager.key),400,'invalid_ticket');
 const patchId=randomUUID(),patch={title:prefix+' patched'};
 const concurrent=await Promise.all(Array.from({length:3},()=>req(path,'PATCH',patch,manager.key,patchId).then(r=>check(r,200))));assert.equal(concurrent.filter(r=>!r.replayed).length,1);
 const updated=await check(await req(path,'GET',undefined,manager.key),200);assert.equal(updated.ticket.title,patch.title);assert.equal(updated.ticket.description,payload.description);assert.equal(updated.ticket.status,'신규');
 await check(await req(path,'PATCH',{description:'latest'},manager.key),200);
 await check(await req(path,'PATCH',patch,manager.key,patchId),200);
 const latest=await check(await req(path,'GET',undefined,manager.key),200);assert.equal(latest.ticket.description,'latest');
 await check(await req(path,'PATCH',{title:'conflict'},manager.key,patchId),409);
 const team=options.teams[0];await check(await req(path,'PATCH',{teamId:team.id,status:'배정'},manager.key),200);
 await check(await req(path,'PATCH',{status:'완료'},manager.key),200);
 await check(await req(path,'PATCH',{status:'신규',teamId:null,assigneeId:null},manager.key),400);
 await check(await req(path,'PATCH',{status:'배정'},manager.key),200);
 await check(await req(path,'PATCH',{status:'신규',teamId:null,assigneeId:null},manager.key),200);
 await check(await req(path,'PATCH',{description:null},manager.key),400);
 const invalid=await check(await req('/api/v1/tickets?limit=101','GET',undefined,manager.key),400);assert.equal(invalid.error.code,'invalid_request');
 const list=await check(await req(`/api/v1/tickets?q=${prefix}`,'GET',undefined,manager.key),200);assert.ok(list.tickets.some(t=>t.number===number));
 await check(await req(path,'DELETE',{},manager.key),400);
 await resetRate(manager.id);
 const deleteId=randomUUID();await check(await req(path,'DELETE',undefined,manager.key,deleteId),204);await check(await req(path,'DELETE',undefined,manager.key,deleteId),204);
 await check(await req(path,'DELETE',undefined,manager.key),404);
 await check(await req(path,'PATCH',patch,manager.key,patchId),409,'ticket_deleted');
 await check(await req('/api/v1/tickets','POST',payload,manager.key,createId),409,'ticket_deleted');
 await check(await req(path,'GET',undefined,manager.key),404);
 await setMeetingApiKeyRole(db,manager.id,'writer');await check(await req(path,'DELETE',undefined,manager.key,deleteId),403);
 await setMeetingApiKeyRole(db,manager.id,'teams_admin');
 const limited=await db.from('meeting_api_keys').update({window_count:60}).eq('id',manager.id);assert.ifError(limited.error);const rl=await req('/api/v1/me','GET',undefined,manager.key);assert.equal(rl.headers.get('retry-after'),'60');await check(rl,429);await resetRate(manager.id);
 const invalidRole=await db.rpc('set_meeting_api_key_role',{p_key_id:manager.id,p_role:'superuser'});assert.ok(invalidRole.error);
 const expired=await db.from('meeting_api_keys').update({expires_at:new Date(Date.now()-1000).toISOString()}).eq('id',manager.id);assert.ifError(expired.error);
 await check(await req('/api/v1/me','GET',undefined,manager.key),401);await check(await req(path,'DELETE',undefined,manager.key,deleteId),401);
 await revokeMeetingApiKey(db,writer.id);await check(await req('/api/v1/meetings','GET',undefined,writer.key),401);
 // RPC authorization also fails closed even if the HTTP precheck was previously successful.
 const raw=await db.rpc('read_agent_api',{p_key_hash:createHash('sha256').update(manager.key).digest('hex'),p_resource:'tickets'});assert.equal(raw.data.error,'invalid_api_key');
 console.log('Teams 관리자 API: 권한·조회·OPTIONS·부분 수정·재시도·강등·만료·폐기·키 값 보존 PASS');
} finally {
 for(const id of notes)await db.from('meeting_notes').delete().eq('id',id);
 for(const id of tickets)await db.from('tickets').delete().eq('id',id);
 for(const id of keys)await db.from('meeting_api_keys').delete().eq('id',id);
 server.stop();
}
