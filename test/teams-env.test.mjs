import assert from 'node:assert/strict';
import test from 'node:test';
import { getServerEnvironment, ServerConfigurationError } from '../src/lib/server/env.ts';

function token(role) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role })}.signature`;
}

function withEnvironment(role, callback) {
  const previous = {
    url: process.env.TEAMS_SUPABASE_URL,
    key: process.env.TEAMS_SUPABASE_PUBLISHABLE_KEY,
    token: process.env.TEAMS_SUPABASE_ACCESS_TOKEN
  };
  process.env.TEAMS_SUPABASE_URL = 'https://teams.example.supabase.co/rest/v1/';
  process.env.TEAMS_SUPABASE_PUBLISHABLE_KEY = 'publishable-test-key';
  process.env.TEAMS_SUPABASE_ACCESS_TOKEN = token(role);
  try { return callback(); } finally {
    for (const [name, value] of Object.entries({
      TEAMS_SUPABASE_URL: previous.url,
      TEAMS_SUPABASE_PUBLISHABLE_KEY: previous.key,
      TEAMS_SUPABASE_ACCESS_TOKEN: previous.token
    })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
}

test('Teams 서버 환경은 전용 runtime role과 정규화된 URL만 받는다', () => {
  withEnvironment('teams_runtime', () => {
    const environment = getServerEnvironment();
    assert.equal(environment.supabaseUrl, 'https://teams.example.supabase.co');
    assert.equal(environment.supabasePublishableKey, 'publishable-test-key');
  });
});

test('공용 service_role token은 Teams 런타임에서 거부한다', () => {
  withEnvironment('service_role', () => {
    assert.throws(() => getServerEnvironment(), ServerConfigurationError);
  });
});
