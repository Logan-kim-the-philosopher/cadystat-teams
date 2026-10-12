import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

export const root = fileURLToPath(new URL('../../', import.meta.url));

function signRuntimeToken(secret) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    iss: 'supabase', aud: 'authenticated', role: 'teams_runtime',
    sub: '00000000-0000-4000-8000-000000000001', iat: now, exp: now + 3600
  })}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
}

export function localEnvironment() {
  if (process.env.TEAMS_SUPABASE_URL && process.env.TEAMS_SUPABASE_PUBLISHABLE_KEY && process.env.TEAMS_SUPABASE_ACCESS_TOKEN) {
    return {
      url: process.env.TEAMS_SUPABASE_URL,
      publishableKey: process.env.TEAMS_SUPABASE_PUBLISHABLE_KEY,
      accessToken: process.env.TEAMS_SUPABASE_ACCESS_TOKEN
    };
  }

  const output = execFileSync(`${root}node_modules/.bin/supabase`, ['status', '-o', 'env'], { cwd: root, encoding: 'utf8' });
  const values = Object.fromEntries(output.split('\n').flatMap((line) => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [];
  }));
  assert.ok(values.API_URL && (values.PUBLISHABLE_KEY || values.ANON_KEY) && values.JWT_SECRET, '로컬 Teams Supabase 연결이 필요합니다.');
  return {
    url: values.API_URL,
    publishableKey: values.PUBLISHABLE_KEY || values.ANON_KEY,
    accessToken: signRuntimeToken(values.JWT_SECRET)
  };
}

export function runtimeEnvironment(local) {
  return {
    TEAMS_SUPABASE_URL: local.url,
    TEAMS_SUPABASE_PUBLISHABLE_KEY: local.publishableKey,
    TEAMS_SUPABASE_ACCESS_TOKEN: local.accessToken
  };
}

export function runtimeClient(local) {
  return createClient(local.url, local.publishableKey, {
    accessToken: async () => local.accessToken,
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
  });
}

export function cleanupLocalRows(table, ids) {
  assert.ok(['meeting_notes', 'tickets', 'meeting_api_keys'].includes(table), '허용된 로컬 테스트 테이블만 정리할 수 있습니다.');
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return;
  for (const id of unique) assert.match(id, /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  const list = unique.map((id) => `'${id}'::uuid`).join(',');
  execFileSync('docker', ['exec', '-i', 'supabase_db_codystat_teams', 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
    input: `delete from public.${table} where id in (${list});`, stdio: ['pipe', 'ignore', 'pipe']
  });
}

export async function startServer(port, local) {
  const env = { ...process.env, HOST: '127.0.0.1', PORT: String(port), ...runtimeEnvironment(local) };
  const server = spawn(process.execPath, ['dist/server/entry.mjs'], { cwd: root, env, stdio: ['ignore', 'ignore', 'ignore'] });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(base)).ok) return { base, stop: () => server.kill('SIGTERM') }; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  server.kill('SIGTERM');
  throw new Error('프로덕션 서버 준비 실패');
}
