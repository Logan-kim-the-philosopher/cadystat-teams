export type ServerEnvironment = Readonly<{ supabaseUrl: string; supabaseServiceRoleKey: string }>;
export class ServerConfigurationError extends Error {}

function normalizeSupabaseUrl(value: string) {
  const normalized = value.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  let parsed: URL;
  try { parsed = new URL(normalized); } catch { throw new ServerConfigurationError('Supabase URL 형식이 올바르지 않습니다.'); }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ServerConfigurationError('CODY_STAT_SUPABASE_URL은 http 또는 https URL이어야 합니다.');
  }

  return parsed.toString().replace(/\/$/, '');
}

export function getServerEnvironment(): ServerEnvironment {
  if (typeof window !== 'undefined') throw new Error('서버 전용 환경변수는 브라우저에서 읽을 수 없습니다.');

  const runtime = typeof process === 'undefined' ? undefined : process.env;
  const supabaseUrl = runtime?.CODY_STAT_SUPABASE_URL ?? import.meta.env.CODY_STAT_SUPABASE_URL;
  const serviceRoleKey = runtime?.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY;
  const accidentallyPublicKey = runtime?.PUBLIC_CODY_STAT_SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.PUBLIC_CODY_STAT_SUPABASE_SERVICE_ROLE_KEY;
  const normalizedServiceRoleKey = serviceRoleKey?.trim();

  if (accidentallyPublicKey) throw new ServerConfigurationError('service-role 키에 PUBLIC_ 접두사를 사용할 수 없습니다.');
  if (!supabaseUrl || !normalizedServiceRoleKey) throw new ServerConfigurationError('CODY_STAT_SUPABASE_URL과 CODY_STAT_SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');

  return Object.freeze({
    supabaseUrl: normalizeSupabaseUrl(supabaseUrl),
    supabaseServiceRoleKey: normalizedServiceRoleKey
  });
}
