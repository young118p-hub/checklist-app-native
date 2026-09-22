// 앱 동기화 코드를 실제 Supabase 없이 시험하기 위한 로컬 미니 스택
//   PGlite(마이그레이션 그대로) → pglite-socket(5433) → PostgREST(3001) → 프록시(54321, Supabase URL 모양)
// 실행: POSTGREST_BIN=/path/to/postgrest node supabase/tests/local-stack.mjs
// 준비되면 "READY" 를 출력한다. 테스트 사용자 두 명(A, B)과 JWT 비밀키는 아래 상수.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer, request } from 'node:http';
import { createHmac } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

export const JWT_SECRET = 'local-test-secret-local-test-secret-000';
export const USERS = {
  A: { id: '00000000-0000-4000-8000-00000000000a', name: '민지' },
  B: { id: '00000000-0000-4000-8000-00000000000b', name: '준호' },
};

const MIGRATIONS = new URL('../migrations/', import.meta.url);
const PG_PORT = 5433;
const REST_PORT = 3001;
const PROXY_PORT = Number(process.env.PROXY_PORT ?? 54321);

const STUB = `
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}',
    app_metadata jsonb not null default '{}');
  -- PostgREST는 request.jwt.claims(JSON)에 넣고, 예전 방식은 request.jwt.claim.sub
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    )::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  create publication supabase_realtime;
`;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
export const signJwt = (payload) => {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', JWT_SECRET).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
};
export const tokenFor = (user) => signJwt({
  sub: user.id, role: 'authenticated', aud: 'authenticated',
  exp: Math.floor(Date.now() / 1000) + 3600, app_metadata: { provider: 'kakao' },
});
export const ANON_KEY = signJwt({ role: 'anon', exp: Math.floor(Date.now() / 1000) + 86400 * 365 });

const db = new PGlite();
await db.exec(STUB);
for (const f of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(new URL(f, MIGRATIONS), 'utf8'));
}
await db.exec(`grant select, insert, update, delete on all tables in schema public to anon, authenticated;`);
for (const u of Object.values(USERS)) {
  await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, $2)`, [u.id, JSON.stringify({ name: u.name })]);
}

const pgServer = new PGLiteSocketServer({ db, port: PG_PORT, host: '127.0.0.1' });
await pgServer.start();

const conf = join(tmpdir(), `postgrest-${process.pid}.conf`);
writeFileSync(conf, [
  `db-uri = "postgres://postgres@127.0.0.1:${PG_PORT}/postgres"`,
  `db-schemas = "public"`,
  `db-anon-role = "anon"`,
  `jwt-secret = "${JWT_SECRET}"`,
  `server-port = ${REST_PORT}`,
  `db-pool = 1`,
  `db-channel-enabled = false`,
  `db-prepared-statements = false`,
].join('\n'));
const rest = spawn(process.env.POSTGREST_BIN ?? 'postgrest', [conf], { stdio: ['ignore', 'pipe', 'pipe'] });
let restReady = false;
const watchLog = d => {
  const text = String(d);
  if (process.env.DEBUG_STACK) process.stderr.write(`[postgrest] ${text}`);
  if (/API server listening/i.test(text)) restReady = true;
};
rest.stdout.on('data', watchLog);
rest.stderr.on('data', watchLog);

const decode = (token) => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());

// Supabase URL 모양: /rest/v1/... → PostgREST, /auth/v1/user → JWT에서 사용자 정보
const proxy = createServer((req, res) => {
  if (req.url.startsWith('/auth/v1/user')) {
    const token = (req.headers.authorization ?? '').replace(/^Bearer /, '');
    try {
      const claims = decode(token);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: claims.sub, aud: 'authenticated', role: 'authenticated', app_metadata: claims.app_metadata ?? {}, user_metadata: {}, created_at: new Date().toISOString() }));
    } catch {
      res.writeHead(401).end('{}');
    }
    return;
  }
  if (!req.url.startsWith('/rest/v1')) {
    res.writeHead(404).end('{}');
    return;
  }
  const upstream = request({
    host: '127.0.0.1', port: REST_PORT, method: req.method, path: req.url.slice('/rest/v1'.length) || '/',
    headers: { ...req.headers, host: `127.0.0.1:${REST_PORT}` },
  }, up => {
    res.writeHead(up.statusCode ?? 502, up.headers);
    up.pipe(res);
  });
  upstream.on('error', e => res.writeHead(502).end(JSON.stringify({ message: String(e) })));
  req.pipe(upstream);
});
proxy.listen(PROXY_PORT, '127.0.0.1');

for (let i = 0; i < 100 && !restReady; i++) await new Promise(r => setTimeout(r, 200));
if (!restReady) {
  console.error('PostgREST did not start');
  process.exit(1);
}
console.log(`READY http://127.0.0.1:${PROXY_PORT}`);

const shutdown = async () => {
  rest.kill();
  proxy.close();
  await pgServer.stop();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
// 부모가 죽어도 PostgREST가 남지 않게
process.on('exit', () => rest.kill('SIGKILL'));
process.stdin.on('end', shutdown);
process.stdin.resume();
