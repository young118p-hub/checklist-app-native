/// <reference types="jest" />
/// <reference types="node" />
// 실제 PostgREST + 우리 마이그레이션(RLS 포함)에 앱 동기화 엔진을 붙여 보는 통합 테스트.
// 로컬 미니 스택이 필요해서 `npm run test:sync`로만 돈다 (npm test에서는 건너뜀).
import { createHmac } from 'crypto';

const URL_ = 'http://127.0.0.1:54321';
const SECRET = 'local-test-secret-local-test-secret-000';
const A = '00000000-0000-4000-8000-00000000000a';   // 민지 (이 기기의 사용자, 앱 엔진)
const B = '00000000-0000-4000-8000-00000000000b';   // 준호 (다른 기기, 별도 클라이언트)

const b64 = (x: string) => Buffer.from(x).toString('base64url');
const jwt = (payload: object) => {
  const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const d = b64(JSON.stringify(payload));
  return `${h}.${d}.${createHmac('sha256', SECRET).update(`${h}.${d}`).digest('base64url')}`;
};
const exp = () => Math.floor(Date.now() / 1000) + 3600;
const tokenFor = (sub: string) => jwt({ sub, role: 'authenticated', aud: 'authenticated', exp: exp() });

process.env.EXPO_PUBLIC_SUPABASE_URL = URL_;
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = jwt({ role: 'anon', exp: exp() });

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-notifications', () => ({
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: false })),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.setTimeout(30000);

const run = process.env.SYNC_IT ? describe : describe.skip;

run('동기화 엔진 ↔ 로컬 Supabase', () => {
  // 환경 변수를 넣은 뒤에 불러와야 클라이언트가 켜진다
  const { createClient } = require('@supabase/supabase-js');
  const { supabase } = require('../client');
  const { sync, together } = require('../engine');
  const { outbox } = require('../outbox');
  const { useChecklistStore } = require('../../stores/checklistStore');

  const junho = createClient(URL_, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${tokenFor(B)}` } },
  });
  const store = () => useChecklistStore.getState();
  const list = (id: string) => store().checklists.find((c: { id: string }) => c.id === id);
  let listId = '';

  beforeAll(async () => {
    await supabase.auth.setSession({ access_token: tokenFor(A), refresh_token: 'local' });
  });

  afterAll(async () => {
    await sync.stop();
  });

  it('로그인 전에 만든 리스트와 체크가 로그인하면 서버에 올라간다', async () => {
    listId = (await store().createChecklist({
      title: '제주 캠핑',
      peopleCount: 2,
      items: [
        { title: '텐트', order: 0, scope: 'shared' },
        { title: '베개', order: 1, scope: 'personal', quantityPerPerson: 1, quantity: 2 },
      ],
    }))!;
    await store().fetchChecklist(listId);
    const tent = list(listId).items.find((i: { title: string }) => i.title === '텐트');
    store().toggleItemComplete(tent.id);         // 로그인 전 체크
    expect(outbox.size()).toBe(0);

    await sync.start(A);
    expect(outbox.size()).toBe(0);
    const c = list(listId);
    expect(c.remote.ownerId).toBe(A);
    expect(c.remote.myMemberKey).toMatch(/[0-9a-f-]{36}/);
    expect(c.items.find((i: { id: string }) => i.id === tent.id).isCompleted).toBe(true);

    const { data: checks } = await supabase.from('item_checks').select('*').eq('checklist_id', listId);
    expect(checks).toHaveLength(1);
    expect(checks[0]).toMatchObject({ item_id: tent.id, checked: true, member_key: c.remote.myMemberKey });
  });

  it('초대 → 준호 참여 → 준호의 변경이 민지 기기에 반영된다', async () => {
    const code = await together.createInvite(listId);
    expect(code).toMatch(/^[0-9a-f]{32}$/);

    const preview = await together.preview(code);
    expect(preview).toMatchObject({ title: '제주 캠핑', item_count: 2, member_count: 1, inviter_nickname: '민지' });

    const accepted = await junho.rpc('accept_invite', { invite_code: code });
    expect(accepted.error).toBeNull();

    // 준호: 이름 공개 켜고, 텐트 체크를 풀고(나중 시각), 자기 베개를 체크, 항목 하나 추가
    const { data: keyRows } = await junho.from('member_keys').select('member_key').eq('checklist_id', listId).eq('user_id', B);
    const junhoKey = keyRows[0].member_key;
    await junho.from('checklist_members').update({ show_name: true }).eq('checklist_id', listId).eq('user_id', B);
    const items = list(listId).items;
    const tent = items.find((i: { title: string }) => i.title === '텐트');
    const pillow = items.find((i: { title: string }) => i.title === '베개');
    const later = new Date().toISOString();
    expect((await junho.from('item_checks').upsert(
      [
        { item_id: tent.id, member_key: junhoKey, checklist_id: listId, checked: false, checked_at: later },
        { item_id: pillow.id, member_key: junhoKey, checklist_id: listId, checked: true, checked_at: later },
      ], { onConflict: 'item_id,member_key' })).error).toBeNull();
    expect((await junho.from('checklist_items').insert({
      id: '99999999-9999-4999-8999-999999999999', checklist_id: listId, title: '랜턴', sort_order: 2, scope: 'shared',
    })).error).toBeNull();

    await sync.now();
    const c = list(listId);
    const junhoMember = c.remote.members.find((m: { userId: string }) => m.userId === B);
    expect(c.remote.members).toHaveLength(2);
    expect(junhoMember).toMatchObject({ nickname: '준호', showName: true, memberKey: junhoKey });
    expect(c.items.find((i: { id: string }) => i.id === tent.id).isCompleted).toBe(false);     // 나중에 누른 준호 기준
    expect(c.items.find((i: { id: string }) => i.id === pillow.id).isCompleted).toBe(false);   // 각자 챙길 것: 내 체크만
    expect(c.items.map((i: { title: string }) => i.title)).toContain('랜턴');
  });

  it('민지의 체크·담당·삭제가 준호 쪽 서버 데이터에 반영된다', async () => {
    const c = list(listId);
    const tent = c.items.find((i: { title: string }) => i.title === '텐트');
    const lantern = c.items.find((i: { title: string }) => i.title === '랜턴');
    await store().fetchChecklist(listId);
    await new Promise(r => setTimeout(r, 20));   // 준호가 누른 뒤에 민지가 누른다
    store().toggleItemComplete(tent.id);
    await store().setAssignee(lantern.id, B);
    const pillow = c.items.find((i: { title: string }) => i.title === '베개');
    await store().deleteItem(pillow.id);
    await sync.now();

    const { data: checks } = await junho.from('item_checks').select('*').eq('item_id', tent.id);
    const latest = checks.sort((a: { checked_at: string }, b: { checked_at: string }) => Date.parse(b.checked_at) - Date.parse(a.checked_at))[0];
    expect(latest.checked).toBe(true);
    const { data: rows } = await junho.from('checklist_items').select('id,assignee_user_id,deleted_at').eq('checklist_id', listId);
    expect(rows.find((r: { id: string }) => r.id === lantern.id).assignee_user_id).toBe(B);
    expect(rows.find((r: { id: string }) => r.id === pillow.id).deleted_at).not.toBeNull();
    // 민지는 이름 비공개라 준호는 민지 키를 모른다
    const { data: keys } = await junho.from('member_keys').select('user_id').eq('checklist_id', listId);
    expect(keys.map((k: { user_id: string }) => k.user_id)).toEqual([B]);
  });

  it('만든 사람이 지우면 준호에게서도 사라진다', async () => {
    await store().deleteChecklist(listId);
    await sync.now();
    const { data } = await junho.from('checklists').select('id').eq('id', listId);
    expect(data).toHaveLength(0);
    expect(list(listId)).toBeUndefined();
  });
});
