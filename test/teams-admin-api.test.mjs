import test from 'node:test';
import assert from 'node:assert/strict';
import { agentPagination, agentTicketInput } from '../src/features/teams/domain/agent-api.ts';
import { setMeetingApiKeyRole } from '../src/lib/server/meeting-api-keys.mjs';
const id='00000000-0000-0000-0000-000000000001';
test('외부 목록 조회는 중복·미지원 query와 페이지 범위를 거부한다',()=>{
 assert.deepEqual(agentPagination(new URL('https://example.test?limit=10&offset=20&q=hello'),true),{limit:10,offset:20,query:'hello'});
 for(const query of ['limit=0','limit=101','offset=-1','offset=1000001','limit=1&limit=2','role=teams_admin'])assert.throws(()=>agentPagination(new URL('https://example.test?'+query),true));
 assert.throws(()=>agentPagination(new URL('https://example.test?limit=10'),false));
});
test('티켓 부분 수정은 생략 필드와 null 연결 해제를 구분하고 권한 주입을 거부한다',()=>{
 assert.deepEqual(agentTicketInput({title:' 이름 ',teamId:null},'PATCH'),{title:'이름',teamId:null});
 assert.deepEqual(agentTicketInput({title:'이름',description:'설명',typeId:id},'POST'),{title:'이름',description:'설명',typeId:id});
 for(const value of [{},{title:null},{typeId:null},{description:''},{role:'teams_admin'},{status:'unknown'},{teamId:''}])assert.throws(()=>agentTicketInput(value,'PATCH'));
 assert.throws(()=>agentTicketInput({title:'a',description:'b',typeId:id,status:'완료'},'POST'));
});
test('키 역할 CLI helper는 ID·역할 검증 후 지정된 RPC만 호출한다',async()=>{
 let called=false;const client={rpc:async(name,args)=>{called=true;assert.equal(name,'set_meeting_api_key_role');assert.deepEqual(args,{p_key_id:id,p_role:'teams_admin'});return {data:{id,role:'teams_admin'},error:null};}};
 await assert.rejects(()=>setMeetingApiKeyRole(client,id,'superuser'));assert.equal(called,false);
 await assert.rejects(()=>setMeetingApiKeyRole(client,'name','teams_admin'));assert.equal(called,false);
 assert.equal((await setMeetingApiKeyRole(client,id,'teams_admin')).role,'teams_admin');
});
