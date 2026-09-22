// Supabase 마이그레이션의 권한 규칙(RLS)과 트리거 검사.
// 실제 Supabase 대신 PGlite(WASM Postgres)에 auth 스키마 일부를 흉내 내고 마이그레이션을 그대로 실행한다.
// 실행: npm run test:db
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS = new URL('../migrations/', import.meta.url);

// Supabase가 기본으로 제공하는 것 중 마이그레이션이 기대는 부분만
const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}');
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  create publication supabase_realtime;
`;
// Supabase는 public 테이블에 기본 권한을 주고 RLS로 막는다. 같은 조건을 만든다.
const SUPABASE_GRANTS = `
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
`;

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';
const LIST = '11111111-1111-4111-8111-111111111111';
const SHARED_ITEM = '22222222-2222-4222-8222-222222222221';
const PERSONAL_ITEM = '22222222-2222-4222-8222-222222222222';

let db;

async function as(userId, fn) {
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  await db.exec(userId ? 'set role authenticated' : 'set role anon');
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

const q = (sql, params) => db.query(sql, params).then(r => r.rows);

async function myKey() {
  const [row] = await q(`select member_key from member_keys where checklist_id = $1 and user_id = auth.uid()`, [LIST]);
  return row.member_key;
}

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const f of readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(f, MIGRATIONS), 'utf8'));
  }
  await db.exec(SUPABASE_GRANTS);
  await db.query(`insert into auth.users (id, raw_user_meta_data) values
    ($1, '{"name":"민지"}'), ($2, '{"nickname":"준호"}'), ($3, '{}')`, [A, B, C]);
});

test('가입하면 프로필이 생기고 닉네임이 들어간다', async () => {
  const rows = await q(`select id, nickname from profiles order by id`);
  assert.deepEqual(rows.map(r => r.nickname), ['민지', '준호', '']);
});

test('리스트를 만들면 만든 사람이 owner 멤버가 되고 익명 키가 생긴다', async () => {
  await as(A, async () => {
    await q(`insert into checklists (id, owner_id, title, start_date) values ($1, $2, '제주 캠핑', '2026-09-18')`, [LIST, A]);
    await q(`insert into checklist_items (id, checklist_id, title, scope) values
      ($1, $3, '텐트', 'shared'), ($2, $3, '베개', 'personal')`, [SHARED_ITEM, PERSONAL_ITEM, LIST]);
    const members = await q(`select user_id, role from checklist_members where checklist_id = $1`, [LIST]);
    assert.deepEqual(members, [{ user_id: A, role: 'owner' }]);
    assert.ok(await myKey());
  });
});

test('다른 사람 명의로 리스트를 만들 수 없다', async () => {
  await as(B, async () => {
    await assert.rejects(q(`insert into checklists (id, owner_id, title) values (gen_random_uuid(), $1, 'x')`, [A]));
  });
});

test('멤버가 아니면 리스트·항목·초대 미리보기 외에는 아무것도 안 보인다', async () => {
  await as(B, async () => {
    assert.equal((await q(`select * from checklists`)).length, 0);
    assert.equal((await q(`select * from checklist_items`)).length, 0);
    assert.equal((await q(`select * from checklist_members`)).length, 0);
    assert.equal((await q(`select * from profiles where id = $1`, [A])).length, 0);
    const upd = await q(`update checklist_items set title = '해킹' where id = $1 returning id`, [SHARED_ITEM]);
    assert.equal(upd.length, 0);
  });
});

test('로그인하지 않은 사용자는 아무것도 못 본다', async () => {
  await as(null, async () => {
    assert.equal((await q(`select * from checklists`)).length, 0);
    await assert.rejects(q(`select public.create_invite($1)`, [LIST]));
  });
});

let inviteCode;

test('멤버만 초대 링크를 만들고, 같은 링크를 다시 돌려받는다', async () => {
  await as(B, async () => {
    await assert.rejects(q(`select public.create_invite($1) as code`, [LIST]), /not a member/);
  });
  await as(A, async () => {
    const [{ code }] = await q(`select public.create_invite($1) as code`, [LIST]);
    assert.match(code, /^[0-9a-f]{32}$/);
    const [{ code: again }] = await q(`select public.create_invite($1) as code`, [LIST]);
    assert.equal(again, code);
    inviteCode = code;
  });
});

test('초대 미리보기는 요약만 보여주고, 참여하면 멤버가 된다', async () => {
  await as(B, async () => {
    const [p] = await q(`select * from public.preview_invite($1)`, [inviteCode]);
    assert.equal(p.title, '제주 캠핑');
    assert.equal(Number(p.item_count), 2);
    assert.equal(Number(p.member_count), 1);
    assert.equal(p.inviter_nickname, '민지');
    assert.equal(p.already_member, false);
    assert.equal((await q(`select * from public.preview_invite('wrong-code')`)).length, 0);

    const [{ cid }] = await q(`select public.accept_invite($1) as cid`, [inviteCode]);
    assert.equal(cid, LIST);
    // 두 번 눌러도 괜찮다
    await q(`select public.accept_invite($1)`, [inviteCode]);
    assert.equal((await q(`select * from checklist_members where checklist_id = $1`, [LIST])).length, 2);
    assert.equal((await q(`select * from checklist_items`)).length, 2);
    // 같은 리스트 멤버의 프로필은 보인다
    assert.equal((await q(`select nickname from profiles where id = $1`, [A]))[0].nickname, '민지');
  });
});

test('만료되거나 취소된 초대로는 참여할 수 없다', async () => {
  await as(A, async () => {
    await q(`update invites set revoked_at = now() where code = $1`, [inviteCode]);
  });
  await as(C, async () => {
    await assert.rejects(q(`select public.accept_invite($1)`, [inviteCode]), /invalid or expired/);
  });
});

test('체크는 내 키로만 쓸 수 있다', async () => {
  const keyA = await as(A, myKey);
  await as(B, async () => {
    await assert.rejects(
      q(`insert into item_checks values ($1, $2, $3, true, now())`, [SHARED_ITEM, keyA, LIST]),
    );
    await q(`insert into item_checks values ($1, $2, $3, true, now())`, [SHARED_ITEM, await myKey(), LIST]);
  });
});

test('다른 리스트의 항목에 체크를 끼워 넣을 수 없다', async () => {
  const OTHER = '33333333-3333-4333-8333-333333333333';
  const OTHER_ITEM = '44444444-4444-4444-8444-444444444444';
  await as(C, async () => {
    await q(`insert into checklists (id, owner_id, title) values ($1, $2, '다른 리스트')`, [OTHER, C]);
    await q(`insert into checklist_items (id, checklist_id, title) values ($1, $2, '물')`, [OTHER_ITEM, OTHER]);
    const [{ member_key }] = await q(`select member_key from member_keys where checklist_id = $1`, [OTHER]);
    await assert.rejects(
      q(`insert into item_checks values ($1, $2, $3, true, now())`, [SHARED_ITEM, member_key, OTHER]),
      /does not belong/,
    );
  });
});

test('늦게 도착한 오래된 체크는 최근 체크를 덮어쓰지 않는다', async () => {
  await as(A, async () => {
    const key = await myKey();
    const upsert = `insert into item_checks values ($1, $2, $3, $4, $5)
      on conflict (item_id, member_key) do update set checked = excluded.checked, checked_at = excluded.checked_at`;
    await q(upsert, [PERSONAL_ITEM, key, LIST, true, '2026-09-17T10:00:00Z']);
    await q(upsert, [PERSONAL_ITEM, key, LIST, false, '2026-09-17T09:00:00Z']); // 오프라인에서 먼저 누른 것
    const [row] = await q(`select checked from item_checks where item_id = $1 and member_key = $2`, [PERSONAL_ITEM, key]);
    assert.equal(row.checked, true);
  });
});

test('미래 시각으로 보낸 체크는 서버 시각으로 잘린다', async () => {
  await as(A, async () => {
    const key = await myKey();
    await q(`update item_checks set checked_at = now() + interval '1 year' where item_id = $1 and member_key = $2`, [PERSONAL_ITEM, key]);
    const [row] = await q(`select checked_at < now() + interval '1 minute' as ok from item_checks where item_id = $1 and member_key = $2`, [PERSONAL_ITEM, key]);
    assert.equal(row.ok, true);
  });
});

test('이름 공개를 켜기 전에는 체크한 사람이 누구인지 알 수 없다', async () => {
  await as(A, async () => {
    // 진행률 계산을 위해 체크 자체는 보인다
    const checks = await q(`select member_key from item_checks where item_id = $1`, [SHARED_ITEM]);
    assert.equal(checks.length, 1);
    // 하지만 그 키가 준호(B)라는 건 모른다
    const keys = await q(`select user_id from member_keys where member_key = $1`, [checks[0].member_key]);
    assert.equal(keys.length, 0);
  });
  await as(B, async () => {
    await q(`update checklist_members set show_name = true where checklist_id = $1 and user_id = $2`, [LIST, B]);
  });
  await as(A, async () => {
    const [check] = await q(`select member_key from item_checks where item_id = $1`, [SHARED_ITEM]);
    const [key] = await q(`select user_id from member_keys where member_key = $1`, [check.member_key]);
    assert.equal(key.user_id, B);
  });
});

test('멤버는 다른 사람의 설정이나 자기 역할을 바꿀 수 없다', async () => {
  await as(B, async () => {
    const other = await q(`update checklist_members set show_name = true where user_id = $1 returning 1`, [A]);
    assert.equal(other.length, 0);
    await assert.rejects(q(`update checklist_members set role = 'owner' where user_id = $1`, [B]));
  });
});

test('멤버는 리스트를 지우거나 주인을 바꿀 수 없고, owner만 지울 수 있다', async () => {
  await as(B, async () => {
    await assert.rejects(q(`update checklists set deleted_at = now() where id = $1`, [LIST]), /only owner/);
    await assert.rejects(q(`update checklists set owner_id = $1 where id = $2`, [B, LIST]), /owner_id/);
    assert.equal((await q(`delete from checklists where id = $1 returning 1`, [LIST])).length, 0);
    // 제목 수정은 된다
    assert.equal((await q(`update checklists set title = '제주 캠핑 2박' where id = $1 returning 1`, [LIST])).length, 1);
  });
});

test('담당을 정할 수 있고, 담당자가 나가면 담당이 풀린다', async () => {
  await as(A, async () => {
    await q(`update checklist_items set assignee_user_id = $1 where id = $2`, [B, SHARED_ITEM]);
    // 멤버가 아닌 사람은 담당이 될 수 없다
    await assert.rejects(q(`update checklist_items set assignee_user_id = $1 where id = $2`, [C, SHARED_ITEM]));
  });
  await as(B, async () => {
    // owner는 나갈 수 없고 멤버는 나갈 수 있다
    assert.equal((await q(`delete from checklist_members where user_id = $1 returning 1`, [A])).length, 0);
    assert.equal((await q(`delete from checklist_members where user_id = $1 and checklist_id = $2 returning 1`, [B, LIST])).length, 1);
    assert.equal((await q(`select * from checklists`)).length, 0);
  });
  await as(A, async () => {
    const [item] = await q(`select assignee_user_id from checklist_items where id = $1`, [SHARED_ITEM]);
    assert.equal(item.assignee_user_id, null);
  });
});

test('owner가 지우면 멤버에게서 사라지지만 owner 기기는 삭제를 동기화할 수 있다', async () => {
  await as(A, async () => {
    const [{ code }] = await q(`select public.create_invite($1) as code`, [LIST]);
    inviteCode = code;
  });
  await as(B, async () => q(`select public.accept_invite($1)`, [inviteCode]));
  await as(A, async () => {
    await q(`update checklists set deleted_at = now() where id = $1`, [LIST]);
    const [row] = await q(`select deleted_at is not null as deleted from checklists where id = $1`, [LIST]);
    assert.equal(row.deleted, true);
    assert.equal((await q(`select * from checklist_items where checklist_id = $1`, [LIST])).length, 2);
  });
  await as(B, async () => {
    assert.equal((await q(`select * from checklists`)).length, 0);
    assert.equal((await q(`select * from checklist_items`)).length, 0);
    await assert.rejects(q(`select public.accept_invite($1)`, [inviteCode]));
  });
});

test('계정을 삭제하면 내 데이터가 모두 지워진다', async () => {
  await as(C, async () => q(`select public.delete_my_account()`));
  const rest = await q(`
    select (select count(*) from auth.users where id = $1)
         + (select count(*) from profiles where id = $1)
         + (select count(*) from checklists where owner_id = $1)
         + (select count(*) from checklist_members where user_id = $1) as n`, [C]);
  assert.equal(Number(rest[0].n), 0);
});

test('로그인하지 않으면 계정 삭제를 부를 수 없다', async () => {
  await as(null, async () => {
    await assert.rejects(q(`select public.delete_my_account()`));
  });
});

test('로그인 전에도 초대 미리보기는 볼 수 있지만 참여는 못 한다', async () => {
  const L2 = '55555555-5555-4555-8555-555555555555';
  let code;
  await as(A, async () => {
    await q(`insert into checklists (id, owner_id, title, cautions) values ($1, $2, '부산', array['주의'])`, [L2, A]);
    [{ code }] = await q(`select public.create_invite($1) as code`, [L2]);
  });
  await as(null, async () => {
    const [p] = await q(`select * from public.preview_invite($1)`, [code]);
    assert.equal(p.title, '부산');
    assert.equal(p.already_member, false);
    await assert.rejects(q(`select public.accept_invite($1)`, [code]));
  });
});

test('닉네임은 앞뒤 공백을 자르고 20자로 제한한다', async () => {
  await as(A, async () => {
    await q(`update profiles set nickname = '   민지  ' where id = $1`, [A]);
    assert.equal((await q(`select nickname from profiles where id = $1`, [A]))[0].nickname, '민지');
    await q(`update profiles set nickname = $2 where id = $1`, [A, '가'.repeat(25)]);
    const [{ n }] = await q(`select char_length(nickname) as n from profiles where id = $1`, [A]);
    assert.equal(n, 20);
    await q(`update profiles set nickname = '민지' where id = $1`, [A]);
  });
});
