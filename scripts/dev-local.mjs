import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = execFileSync(`${root}node_modules/.bin/supabase`, ['status', '-o', 'env'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const values = Object.fromEntries(output.split('\n').flatMap((line) => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [];
}));
assert.ok(values.API_URL && (values.PUBLISHABLE_KEY || values.ANON_KEY) && values.JWT_SECRET, 'npm run db:start로 로컬 Teams Supabase를 먼저 실행하세요.');
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(values.API_URL).hostname), 'dev:local은 로컬 Supabase만 허용합니다.');

const now = Math.floor(Date.now() / 1000);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
  iss: 'supabase', aud: 'authenticated', role: 'teams_runtime',
  sub: '00000000-0000-4000-8000-000000000001', iat: now, exp: now + 86400
})}`;
const accessToken = `${unsigned}.${createHmac('sha256', values.JWT_SECRET).update(unsigned).digest('base64url')}`;
const child = spawn(`${root}node_modules/.bin/astro`, ['dev', ...process.argv.slice(2)], {
  cwd: root,
  env: {
    ...process.env,
    TEAMS_SUPABASE_URL: values.API_URL,
    TEAMS_SUPABASE_PUBLISHABLE_KEY: values.PUBLISHABLE_KEY || values.ANON_KEY,
    TEAMS_SUPABASE_ACCESS_TOKEN: accessToken
  },
  stdio: 'inherit'
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
