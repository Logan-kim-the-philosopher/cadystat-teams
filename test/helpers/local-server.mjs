import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const root = fileURLToPath(new URL('../../', import.meta.url));
export function localEnvironment() {
  if (process.env.CODY_STAT_SUPABASE_URL && process.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY) {
    return { url: process.env.CODY_STAT_SUPABASE_URL, key: process.env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY };
  }
  const output = execFileSync(`${root}node_modules/.bin/supabase`, ['status', '-o', 'env'], { cwd: root, encoding: 'utf8' });
  const values = Object.fromEntries(output.split('\n').flatMap((line) => { const m = line.match(/^([A-Z_]+)=(.*)$/); return m ? [[m[1], m[2].replace(/^['"]|['"]$/g, '')]] : []; }));
  assert.ok(values.API_URL && values.SERVICE_ROLE_KEY, '로컬 Supabase 연결 필요');
  return { url: values.API_URL, key: values.SERVICE_ROLE_KEY };
}
export async function startServer(port, local) {
  const env = { ...process.env, HOST: '127.0.0.1', PORT: String(port) };
  env.CODY_STAT_SUPABASE_URL = ''; env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY = '';
  if (local) { env.CODY_STAT_SUPABASE_URL = local.url; env.CODY_STAT_SUPABASE_SERVICE_ROLE_KEY = local.key; }
  const server = spawn(process.execPath, ['dist/server/entry.mjs'], { cwd: root, env, stdio: ['ignore', 'ignore', 'ignore'] });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) return { base, stop: () => server.kill('SIGTERM') }; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  server.kill('SIGTERM'); throw new Error('프로덕션 서버 준비 실패');
}
