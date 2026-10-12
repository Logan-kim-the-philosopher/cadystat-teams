import { createHash, randomBytes } from 'node:crypto';

const keyPattern = /^cst_mk_[A-Za-z0-9_-]{43}$/;
const uuidPattern = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const publicColumns = 'id,name,role,key_prefix,created_at,expires_at,revoked_at,last_used_at';

export function hashMeetingApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

export function meetingApiKeyHashFromHeader(header) {
  const match = typeof header === 'string' ? /^Bearer ([^\s]+)$/i.exec(header) : null;
  return match && keyPattern.test(match[1]) ? hashMeetingApiKey(match[1]) : null;
}

/** Only trusted server operators can call these helpers with a service-role client. */
export async function issueMeetingApiKey(client, name, days = 90) {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) throw new Error('키 이름은 1~80자여야 합니다.');
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('유효 기간은 1~365일이어야 합니다.');
  const key = `cst_mk_${randomBytes(32).toString('base64url')}`;
  const { data, error } = await client.from('meeting_api_keys').insert({
    name: name.trim(), key_hash: hashMeetingApiKey(key), key_prefix: key.slice(0, 15),
    expires_at: new Date(Date.now() + days * 86400000).toISOString()
  }).select(publicColumns).single();
  if (error || !data) throw new Error('키를 발급하지 못했습니다. DB 연결과 migration 적용 상태를 확인하세요.');
  return { ...data, key };
}

export async function listMeetingApiKeys(client) {
  const { data, error } = await client.from('meeting_api_keys').select(publicColumns).order('created_at', { ascending: false });
  if (error) throw new Error('키 목록을 읽지 못했습니다.');
  return data;
}

export async function revokeMeetingApiKey(client, id) {
  if (typeof id !== 'string' || !uuidPattern.test(id)) throw new Error('목록에 표시된 키 ID(UUID)가 필요합니다.');
  const { data, error } = await client.from('meeting_api_keys').update({ revoked_at: new Date().toISOString() })
    .eq('id', id).select('id').maybeSingle();
  if (error || !data) throw new Error('키를 폐기하지 못했습니다. 키 ID와 DB 연결을 확인하세요.');
  return { id: data.id, revoked: true };
}

export async function setMeetingApiKeyRole(client, id, role) {
  if (typeof id !== 'string' || !uuidPattern.test(id)) throw new Error('목록에 표시된 키 ID(UUID)가 필요합니다.');
  if (!['writer', 'teams_admin'].includes(role)) throw new Error('역할은 writer 또는 teams_admin이어야 합니다.');
  const { data, error } = await client.rpc('set_meeting_api_key_role', { p_key_id: id, p_role: role });
  if (error || !data) throw new Error('키 역할을 변경하지 못했습니다.');
  return data;
}
