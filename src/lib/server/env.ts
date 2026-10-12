export type ServerEnvironment = Readonly<{
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseAccessToken: string;
}>;
export class ServerConfigurationError extends Error {}

function normalizeSupabaseUrl(value: string) {
  const normalized = value.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  let parsed: URL;
  try { parsed = new URL(normalized); } catch { throw new ServerConfigurationError('Supabase URL 형식이 올바르지 않습니다.'); }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ServerConfigurationError('TEAMS_SUPABASE_URL은 http 또는 https URL이어야 합니다.');
  }

  return parsed.toString().replace(/\/$/, '');
}

export function getServerEnvironment(): ServerEnvironment {
  if (typeof window !== 'undefined') throw new Error('서버 전용 환경변수는 브라우저에서 읽을 수 없습니다.');

  const runtime = typeof process === 'undefined' ? undefined : process.env;
  const buildEnvironment = import.meta.env ?? {};
  const supabaseUrl = runtime?.TEAMS_SUPABASE_URL ?? buildEnvironment.TEAMS_SUPABASE_URL;
  const publishableKey = runtime?.TEAMS_SUPABASE_PUBLISHABLE_KEY ?? buildEnvironment.TEAMS_SUPABASE_PUBLISHABLE_KEY;
  const accessToken = runtime?.TEAMS_SUPABASE_ACCESS_TOKEN ?? buildEnvironment.TEAMS_SUPABASE_ACCESS_TOKEN;
  const accidentallyPublicToken = runtime?.PUBLIC_TEAMS_SUPABASE_ACCESS_TOKEN ?? buildEnvironment.PUBLIC_TEAMS_SUPABASE_ACCESS_TOKEN;
  const normalizedPublishableKey = publishableKey?.trim();
  const normalizedAccessToken = accessToken?.trim();

  if (accidentallyPublicToken) throw new ServerConfigurationError('Teams DB access token에 PUBLIC_ 접두사를 사용할 수 없습니다.');
  if (!supabaseUrl || !normalizedPublishableKey || !normalizedAccessToken) {
    throw new ServerConfigurationError('TEAMS_SUPABASE_URL, TEAMS_SUPABASE_PUBLISHABLE_KEY, TEAMS_SUPABASE_ACCESS_TOKEN이 필요합니다.');
  }

  const payload = normalizedAccessToken.split('.')[1];
  let role: unknown;
  try { role = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString('utf8')).role; } catch {}
  if (role !== 'teams_runtime') {
    throw new ServerConfigurationError('TEAMS_SUPABASE_ACCESS_TOKEN은 teams_runtime 역할 토큰이어야 합니다.');
  }

  return Object.freeze({
    supabaseUrl: normalizeSupabaseUrl(supabaseUrl),
    supabasePublishableKey: normalizedPublishableKey,
    supabaseAccessToken: normalizedAccessToken
  });
}
