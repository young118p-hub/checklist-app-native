import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './client';
import { Op, outbox } from './outbox';
import { mergeSnapshot } from './merge';
import { PENDING_ME, RemoteSnapshot, toChecklistRow, toItemRow } from './mapping';
import { useChecklistStore } from '../stores/checklistStore';
import { Checklist } from '../types';

type Result = 'ok' | 'retry' | 'drop';

let userId: string | null = null;
let running: Promise<void> | null = null;
let rerun = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

// 네트워크 문제는 나중에 다시, 권한·형식 문제(PostgreSQL 오류 코드)는 버린다
const classify = (error: { code?: string; message?: string } | null): Result => {
  if (!error) return 'ok';
  const code = error.code ?? '';
  if (!code || code.startsWith('PGRST3') || /network|fetch|timeout/i.test(error.message ?? '')) {
    console.warn('[sync] temporary error, will retry:', code, error.message);
    return 'retry';
  }
  console.warn('[sync] dropped change:', code, error.message);
  return 'drop';
};

const getList = (id: string): Checklist | undefined => useChecklistStore.getState().checklists.find(c => c.id === id);

const fetchMyKey = async (checklistId: string): Promise<string | undefined> => {
  const { data } = await supabase!.from('member_keys').select('member_key')
    .eq('checklist_id', checklistId).eq('user_id', userId!).maybeSingle();
  return data?.member_key;
};

const sendOp = async (op: Op): Promise<Result> => {
  const sb = supabase!;
  const list = getList(op.kind === 'checklist' ? op.id : op.checklistId);

  if (op.kind === 'checklist') {
    if (op.deleted === 'leave') {
      return classify((await sb.from('checklist_members').delete().eq('checklist_id', op.id).eq('user_id', userId!)).error);
    }
    if (op.deleted === 'delete' || !list) {
      return classify((await sb.from('checklists').update({ deleted_at: new Date().toISOString() }).eq('id', op.id)).error);
    }
    const row = toChecklistRow(list, userId!);
    if (list.remote) {
      // 이미 올라간 리스트는 update (멤버는 owner가 아니라서 insert 권한이 없다)
      const { owner_id: _owner, ...patch } = row;
      return classify((await sb.from('checklists').update(patch).eq('id', op.id)).error);
    }
    const result = classify((await sb.from('checklists').upsert(row, { onConflict: 'id' })).error);
    if (result === 'ok') {
      const myKey = await fetchMyKey(op.id);
      useChecklistStore.getState().setRemote(op.id, {
        ownerId: userId!,
        myMemberKey: myKey,
        members: [{ userId: userId!, nickname: '', role: 'owner', showName: false, colorIndex: 0, memberKey: myKey, isMe: true }],
      });
    }
    return result;
  }

  if (op.kind === 'item') {
    const item = list?.items.find(i => i.id === op.id);
    if (!item) {
      return classify((await sb.from('checklist_items').update({ deleted_at: new Date().toISOString() }).eq('id', op.id)).error);
    }
    return classify((await sb.from('checklist_items').upsert(toItemRow(item, op.checklistId), { onConflict: 'id' })).error);
  }

  // check
  if (!list) return 'drop';
  const memberKey = list.remote?.myMemberKey ?? await fetchMyKey(op.checklistId);
  if (!memberKey) return 'retry';   // 리스트가 아직 안 올라감
  return classify((await sb.from('item_checks').upsert({
    item_id: op.itemId, member_key: memberKey, checklist_id: op.checklistId, checked: op.checked, checked_at: op.at,
  }, { onConflict: 'item_id,member_key' })).error);
};

const push = async () => {
  for (const op of outbox.peek()) {
    let result: Result;
    try {
      result = await sendOp(op);
    } catch (e) {
      console.warn('[sync] send failed, will retry:', op.kind, e);
      result = 'retry';
    }
    if (result === 'retry') return false;
    outbox.remove(op);
  }
  return true;
};

const selectIn = async <T,>(table: string, column: string, ids: string[], columns = '*'): Promise<T[]> => {
  if (ids.length === 0) return [];
  const { data, error } = await supabase!.from(table).select(columns).in(column, ids);
  if (error) throw error;
  return (data ?? []) as T[];
};

export const fetchSnapshot = async (): Promise<RemoteSnapshot> => {
  const { data: checklists, error } = await supabase!.from('checklists').select('*');
  if (error) throw error;
  const ids = (checklists ?? []).map(c => c.id);
  const [items, checks, members, keys] = await Promise.all([
    selectIn<RemoteSnapshot['items'][number]>('checklist_items', 'checklist_id', ids),
    selectIn<RemoteSnapshot['checks'][number]>('item_checks', 'checklist_id', ids),
    selectIn<RemoteSnapshot['members'][number]>('checklist_members', 'checklist_id', ids),
    selectIn<RemoteSnapshot['keys'][number]>('member_keys', 'checklist_id', ids),
  ]);
  const userIds = [...new Set(members.map(m => m.user_id))];
  const profiles = await selectIn<RemoteSnapshot['profiles'][number]>('profiles', 'id', userIds, 'id,nickname');
  return { checklists: checklists ?? [], items, checks, members, keys, profiles };
};

const pull = async () => {
  const snapshot = await fetchSnapshot();
  const store = useChecklistStore.getState();
  const { checklists, removedIds } = mergeSnapshot(store.checklists, snapshot, userId!, outbox.pendingKeys());
  await store.applySyncedLists(checklists, removedIds);
};

const run = async () => {
  try {
    await outbox.load();
    const pushed = await push();
    if (pushed) await pull();
  } catch (e) {
    console.warn('[sync] failed, will retry:', e);
  }
};

export const sync = {
  // 보내고 → 받아오기. 동시에 여러 번 불려도 한 번씩 이어서 실행
  now(): Promise<void> {
    if (!supabase || !userId) return Promise.resolve();
    if (running) {
      rerun = true;
      return running;
    }
    running = run().finally(() => {
      running = null;
      if (rerun) {
        rerun = false;
        sync.now();
      }
    });
    return running;
  },

  // 기기에서 바뀐 것을 조금 모았다가 보낸다
  soon() {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => sync.now(), 800);
  },

  // 로그인하면 기기에 있던 리스트를 모두 올린다
  async start(id: string) {
    userId = id;
    await outbox.load();
    outbox.setEnabled(true);
    outbox.onChange(() => sync.soon());
    const ops: Op[] = [];
    for (const c of useChecklistStore.getState().checklists) {
      if (c.remote) continue;
      ops.push({ kind: 'checklist', id: c.id });
      for (const item of c.items) {
        ops.push({ kind: 'item', checklistId: c.id, id: item.id });
        if (item.isCompleted) {
          ops.push({ kind: 'check', checklistId: c.id, itemId: item.id, checked: true, at: new Date(item.updatedAt).toISOString() });
        }
      }
    }
    useChecklistStore.getState().adoptLocalChecks();
    outbox.recordMany(ops);
    await sync.now();
  },

  // 로그아웃: 다른 사람 리스트는 기기에서 지우고, 내 리스트는 기기 전용으로 되돌린다
  async stop() {
    const me = userId;
    userId = null;
    outbox.onChange(null);
    outbox.setEnabled(false);
    outbox.clear();
    realtime.closeAll();
    if (me) await useChecklistStore.getState().detachRemote(me);
  },

  userId: () => userId,
};

// ───────────── 실시간 ─────────────

const channels = new Map<string, RealtimeChannel>();
let pullTimer: ReturnType<typeof setTimeout> | null = null;
const pullSoon = () => {
  if (pullTimer) clearTimeout(pullTimer);
  pullTimer = setTimeout(() => sync.now(), 400);
};

export const realtime = {
  // 상세 화면을 열어둔 동안 다른 멤버의 변경을 받는다
  watch(checklistId: string): () => void {
    if (!supabase || !userId || channels.has(checklistId)) return () => {};
    const filter = `checklist_id=eq.${checklistId}`;
    const channel = supabase.channel(`list:${checklistId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items', filter }, pullSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_checks', filter }, pullSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_members', filter }, pullSoon)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklists', filter: `id=eq.${checklistId}` }, pullSoon)
      .subscribe();
    channels.set(checklistId, channel);
    return () => {
      channels.delete(checklistId);
      supabase!.removeChannel(channel);
    };
  },
  closeAll() {
    for (const ch of channels.values()) supabase?.removeChannel(ch);
    channels.clear();
  },
};

// ───────────── 함께 챙기기 ─────────────

export const together = {
  async createInvite(checklistId: string): Promise<string> {
    await sync.now();   // 리스트가 먼저 서버에 있어야 한다
    const { data, error } = await supabase!.rpc('create_invite', { target_checklist: checklistId });
    if (error) throw error;
    return data as string;
  },
  async preview(code: string) {
    const { data, error } = await supabase!.rpc('preview_invite', { invite_code: code });
    if (error) throw error;
    return (data as InvitePreview[] | null)?.[0] ?? null;
  },
  async accept(code: string): Promise<string> {
    const { data, error } = await supabase!.rpc('accept_invite', { invite_code: code });
    if (error) throw error;
    await sync.now();
    return data as string;
  },
  async setShowName(checklistId: string, on: boolean) {
    const { error } = await supabase!.from('checklist_members').update({ show_name: on })
      .eq('checklist_id', checklistId).eq('user_id', userId!);
    if (error) throw error;
    await sync.now();
  },
};

export interface InvitePreview {
  checklist_id: string;
  title: string;
  start_date: string | null;
  people_count: number;
  item_count: number;
  member_count: number;
  inviter_nickname: string | null;
  already_member: boolean;
}

export { PENDING_ME };
