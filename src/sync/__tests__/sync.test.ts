/// <reference types="jest" />
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

import { coalesce, ordered, Op, outbox } from '../outbox';
import { PENDING_ME, RemoteSnapshot, deriveCompleted, toChecklistRow } from '../mapping';
import { mergeSnapshot } from '../merge';
import { useChecklistStore } from '../../stores/checklistStore';
import { Checklist, ChecklistItem } from '../../types';

const ME = 'user-me';
const MINJI = 'user-minji';
const LIST = 'list-1';

const item = (id: string, patch: Partial<ChecklistItem> = {}): ChecklistItem => ({
  id, checklistId: LIST, title: id, isCompleted: false, order: 0,
  createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-01'), ...patch,
});

const list = (patch: Partial<Checklist> = {}): Checklist => ({
  id: LIST, title: '제주 캠핑', isTemplate: false, isPublic: false, peopleCount: 2, userId: ME,
  createdAt: new Date('2026-09-01'), updatedAt: new Date('2026-09-01'),
  user: { id: ME, email: '' }, items: [], _count: { likes: 0, reviews: 0, comments: 0 }, ...patch,
});

const snapshot = (patch: Partial<RemoteSnapshot> = {}): RemoteSnapshot => ({
  checklists: [{
    id: LIST, owner_id: MINJI, title: '제주 캠핑', description: null, people_count: 2, category_id: '아웃도어',
    source: null, start_date: null, cautions: null, deleted_at: null, updated_at: '2026-09-20T00:00:00+00:00',
  }],
  items: [
    { id: 'tent', checklist_id: LIST, title: '텐트', description: null, quantity: 1, unit: '개', sort_order: 0, key: null,
      section: null, quantity_per_person: null, scope: 'shared', reason: null, baggage: null, added_because: null,
      assignee_user_id: null, deleted_at: null },
    { id: 'pillow', checklist_id: LIST, title: '베개', description: null, quantity: 2, unit: '개', sort_order: 1, key: null,
      section: null, quantity_per_person: 1, scope: 'personal', reason: null, baggage: null, added_because: null,
      assignee_user_id: null, deleted_at: null },
  ],
  checks: [],
  members: [
    { checklist_id: LIST, user_id: MINJI, role: 'owner', show_name: false, color_index: 0 },
    { checklist_id: LIST, user_id: ME, role: 'member', show_name: false, color_index: 1 },
  ],
  keys: [{ member_key: 'key-me', checklist_id: LIST, user_id: ME }],   // 민지는 이름 비공개라 키가 안 보인다
  profiles: [{ id: MINJI, nickname: '민지' }, { id: ME, nickname: '준호' }],
  ...patch,
});

describe('보낼 변경 목록', () => {
  it('같은 대상은 마지막 변경만 남긴다', () => {
    let ops: Op[] = [];
    ops = coalesce(ops, { kind: 'check', checklistId: LIST, itemId: 'tent', checked: true, at: '1' });
    ops = coalesce(ops, { kind: 'item', checklistId: LIST, id: 'tent' });
    ops = coalesce(ops, { kind: 'check', checklistId: LIST, itemId: 'tent', checked: false, at: '2' });
    expect(ops).toHaveLength(2);
    expect(ops.find(o => o.kind === 'check')).toMatchObject({ checked: false });
  });

  it('리스트 → 항목 → 체크 순서로 보낸다', () => {
    const ops: Op[] = [
      { kind: 'check', checklistId: LIST, itemId: 'a', checked: true, at: '1' },
      { kind: 'item', checklistId: LIST, id: 'a' },
      { kind: 'checklist', id: LIST },
    ];
    expect(ordered(ops).map(o => o.kind)).toEqual(['checklist', 'item', 'check']);
  });
});

describe('체크 상태 계산', () => {
  it('같이 챙길 것은 가장 최근에 누른 사람 기준 (시각 형식이 달라도)', () => {
    const checks = [
      { memberKey: 'a', checked: true, checkedAt: '2026-09-20T10:00:00+00:00' },
      { memberKey: 'b', checked: false, checkedAt: '2026-09-20T10:00:01.000Z' },
    ];
    expect(deriveCompleted({ scope: 'shared', checks, isCompleted: true }, 'a')).toBe(false);
  });

  it('각자 챙길 것은 내 체크만 본다', () => {
    const checks = [{ memberKey: 'other', checked: true, checkedAt: '2026-09-20T10:00:00Z' }];
    expect(deriveCompleted({ scope: 'personal', checks, isCompleted: false }, 'me')).toBe(false);
    expect(deriveCompleted({ scope: 'personal', checks: [...checks, { memberKey: 'me', checked: true, checkedAt: '2026-09-20T09:00:00Z' }], isCompleted: false }, 'me')).toBe(true);
  });
});

describe('서버 → 기기 합치기', () => {
  it('초대받아 들어간 리스트가 멤버·항목과 함께 생긴다', () => {
    const { checklists } = mergeSnapshot([], snapshot({
      checks: [{ item_id: 'tent', member_key: 'hidden-minji', checklist_id: LIST, checked: true, checked_at: '2026-09-20T10:00:00+00:00' }],
    }), ME, new Set());
    const c = checklists[0];
    expect(c.remote?.myMemberKey).toBe('key-me');
    expect(c.remote?.members.map(m => m.nickname)).toEqual(['민지', '준호']);
    expect(c.items.find(i => i.id === 'tent')?.isCompleted).toBe(true);    // 누가 챙겼는지는 몰라도 진행률에는 반영
    expect(c.remote?.members.find(m => m.userId === MINJI)?.memberKey).toBeUndefined();
  });

  it('아직 못 보낸 내 체크와 항목 수정은 서버 값보다 우선한다', () => {
    const local = list({
      remote: { ownerId: MINJI, myMemberKey: 'key-me', members: [] },
      items: [
        item('tent', { title: '텐트(큰 거)', scope: 'shared' }),
        item('pillow', { scope: 'personal', checks: [{ memberKey: 'key-me', checked: true, checkedAt: '2026-09-21T00:00:00Z' }], isCompleted: true }),
        item('new', { title: '랜턴', order: 5 }),
      ],
    });
    const { checklists } = mergeSnapshot([local], snapshot(), ME, new Set(['i:tent', 'k:pillow', 'i:new']));
    const items = checklists[0].items;
    expect(items.find(i => i.id === 'tent')?.title).toBe('텐트(큰 거)');
    expect(items.find(i => i.id === 'pillow')?.isCompleted).toBe(true);
    expect(items.map(i => i.id)).toContain('new');
  });

  it('다른 사람이 지운 항목은 사라지고, 서버에서 사라진 리스트는 기기에서도 지운다', () => {
    const snap = snapshot();
    snap.items[0].deleted_at = '2026-09-21T00:00:00Z';
    const joined = list({ remote: { ownerId: MINJI, members: [] }, items: [item('tent')] });
    const gone = list({ id: 'gone', remote: { ownerId: MINJI, members: [] } });
    const uploading = list({ id: 'uploading' });
    const localOnly = list({ id: 'local' });
    const { checklists, removedIds } = mergeSnapshot([joined, gone, uploading, localOnly], snap, ME, new Set(['c:uploading']));
    expect(checklists.find(c => c.id === LIST)?.items.map(i => i.id)).toEqual(['pillow']);
    expect(removedIds).toEqual(['gone']);
    expect(checklists.map(c => c.id).sort()).toEqual([LIST, 'local', 'uploading'].sort());
  });

  it('로그인 전에 한 체크는 서버 키를 받으면 내 키로 바뀐다', () => {
    const local = list({
      items: [item('pillow', { scope: 'personal', isCompleted: true, checks: [{ memberKey: PENDING_ME, checked: true, checkedAt: '2026-09-21T00:00:00Z' }] })],
    });
    const { checklists } = mergeSnapshot([local], snapshot(), ME, new Set(['k:pillow']));
    const pillow = checklists[0].items.find(i => i.id === 'pillow')!;
    expect(pillow.checks?.map(c => c.memberKey)).toEqual(['key-me']);
    expect(pillow.isCompleted).toBe(true);
  });
});

describe('서버 행 만들기', () => {
  it('제목·인원은 서버 제약 안으로 맞춘다', () => {
    const row = toChecklistRow(list({ title: '가'.repeat(150), peopleCount: 99 }), ME);
    expect(row.title).toHaveLength(100);
    expect(row.people_count).toBe(50);
    expect(row.owner_id).toBe(ME);
  });
});

describe('스토어 연결', () => {
  beforeEach(() => {
    outbox.clear();
    useChecklistStore.setState({ checklists: [], currentChecklist: null });
  });

  it('로그인 안 했으면 아무것도 쌓지 않는다', async () => {
    outbox.setEnabled(false);
    await useChecklistStore.getState().createChecklist({ title: '장보기', items: [{ title: '우유', order: 0 }] });
    expect(outbox.size()).toBe(0);
  });

  it('로그인했으면 만들기·체크가 쌓이고, 체크는 멤버별 기록으로 남는다', async () => {
    outbox.setEnabled(true);
    const id = (await useChecklistStore.getState().createChecklist({ title: '장보기', items: [{ title: '우유', order: 0 }] }))!;
    expect(outbox.peek().map(o => o.kind)).toEqual(['checklist', 'item']);
    await useChecklistStore.getState().fetchChecklist(id);
    const milk = useChecklistStore.getState().currentChecklist!.items[0];
    useChecklistStore.getState().toggleItemComplete(milk.id);
    const after = useChecklistStore.getState().currentChecklist!.items[0];
    expect(after.isCompleted).toBe(true);
    expect(after.checks?.[0]).toMatchObject({ memberKey: PENDING_ME, checked: true });
    expect(outbox.peek().some(o => o.kind === 'check' && o.itemId === milk.id && o.checked)).toBe(true);
    outbox.setEnabled(false);
  });

  it('로그아웃하면 다른 사람 리스트는 지우고 내 리스트는 기기 전용으로 되돌린다', async () => {
    useChecklistStore.setState({
      checklists: [
        list({ id: 'theirs', remote: { ownerId: MINJI, members: [] } }),
        list({ id: 'mine', remote: { ownerId: ME, members: [] }, items: [item('a', { isCompleted: true, checks: [{ memberKey: 'k', checked: true, checkedAt: 'x' }] })] }),
      ],
    });
    await useChecklistStore.getState().detachRemote(ME);
    const lists = useChecklistStore.getState().checklists;
    expect(lists.map(c => c.id)).toEqual(['mine']);
    expect(lists[0].remote).toBeUndefined();
    expect(lists[0].items[0]).toMatchObject({ isCompleted: true });
    expect(lists[0].items[0].checks).toBeUndefined();
  });
});
