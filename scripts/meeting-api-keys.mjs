import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { issueMeetingApiKey, listMeetingApiKeys, revokeMeetingApiKey, setMeetingApiKeyRole } from '../src/lib/server/meeting-api-keys.mjs';

try {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { name: { type: 'string' }, days: { type: 'string' }, role: { type: 'string' }, help: { type: 'boolean' } }
  });
  const [command, id] = positionals;
  if (values.help) {
    console.log('issue --name "에이전트 이름" [--days 90] | list | revoke <키 ID> | set-role <키 ID> --role writer|teams_admin');
  } else {
    if (!['issue', 'list', 'revoke', 'set-role'].includes(command) || positionals.length !== (['revoke','set-role'].includes(command) ? 2 : 1)) {
      throw new Error('사용법: issue --name "에이전트 이름" [--days 90] | list | revoke <키 ID> | set-role <키 ID> --role writer|teams_admin');
    }
    if (command !== 'issue' && (values.name || values.days)) throw new Error('--name과 --days는 issue에서만 사용합니다.');
    if (command !== 'set-role' && values.role) throw new Error('--role은 set-role에서만 사용합니다.');
    const url = process.env.CODY_STAT_SUPABASE_URL;
    const secret = process.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secret) throw new Error('운영자용 Supabase 서버 환경변수가 필요합니다.');
    const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const result = command === 'issue' ? await issueMeetingApiKey(client, values.name, values.days === undefined ? 90 : Number(values.days))
      : command === 'list' ? await listMeetingApiKeys(client) : command === 'set-role' ? await setMeetingApiKeyRole(client, id, values.role) : await revokeMeetingApiKey(client, id);
    if (command === 'issue') console.error('키 원문은 이번 출력에서만 확인할 수 있습니다. 발급 대상에게 안전하게 전달하세요.');
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) {
  // Do not print SDK/network error objects, headers, or environment values.
  console.error(error instanceof Error && !error.message.includes('fetch') ? error.message : '키 관리 요청에 실패했습니다. 연결 설정을 확인하세요.');
  process.exitCode = 1;
}
