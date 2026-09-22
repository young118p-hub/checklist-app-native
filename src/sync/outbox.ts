import AsyncStorage from '@react-native-async-storage/async-storage';

// 서버에 아직 못 보낸 변경. 리스트·항목은 id만 적어두고 보낼 때 기기의 최신 상태를 읽는다
// (여러 번 고쳐도 한 번만 보냄). 기기에 없으면 삭제로 보낸다.
export type Op =
  // deleted: 기기에서 지운 리스트. 만든 사람이면 서버에서도 지우고, 멤버면 나가기
  | { kind: 'checklist'; id: string; deleted?: 'delete' | 'leave' }
  | { kind: 'item'; checklistId: string; id: string }
  | { kind: 'check'; checklistId: string; itemId: string; checked: boolean; at: string };

const KEY = 'sync-outbox';

export const opKey = (op: Op) =>
  op.kind === 'checklist' ? `c:${op.id}` : op.kind === 'item' ? `i:${op.id}` : `k:${op.itemId}`;

// 리스트가 먼저 있어야 항목을, 항목이 먼저 있어야 체크를 넣을 수 있다
const RANK: Record<Op['kind'], number> = { checklist: 0, item: 1, check: 2 };

// 같은 대상의 변경은 마지막 것만 남긴다
export const coalesce = (ops: Op[], next: Op): Op[] => [...ops.filter(o => opKey(o) !== opKey(next)), next];

export const ordered = (ops: Op[]): Op[] =>
  ops.map((op, i) => ({ op, i })).sort((a, b) => RANK[a.op.kind] - RANK[b.op.kind] || a.i - b.i).map(x => x.op);

let queue: Op[] = [];
let enabled = false;
let loaded = false;
let listener: (() => void) | null = null;

const persist = () => AsyncStorage.setItem(KEY, JSON.stringify(queue)).catch(e => console.error('outbox save failed', e));

export const outbox = {
  async load() {
    if (loaded) return;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      queue = Array.isArray(parsed) ? parsed : [];
    } catch {
      queue = [];
    }
    loaded = true;
  },
  // 로그인했을 때만 기록한다. 혼자 쓸 때는 아무것도 쌓이지 않는다
  setEnabled(on: boolean) {
    enabled = on;
  },
  isEnabled: () => enabled,
  onChange(fn: (() => void) | null) {
    listener = fn;
  },
  record(op: Op) {
    if (!enabled) return;
    queue = coalesce(queue, op);
    persist();
    listener?.();
  },
  recordMany(ops: Op[]) {
    if (!enabled || ops.length === 0) return;
    for (const op of ops) queue = coalesce(queue, op);
    persist();
    listener?.();
  },
  peek: (): Op[] => ordered(queue),
  pendingKeys: () => new Set(queue.map(opKey)),
  remove(op: Op) {
    const key = opKey(op);
    // 보내는 사이에 같은 대상이 다시 바뀌었으면 새 변경은 남긴다
    queue = queue.filter(o => !(opKey(o) === key && JSON.stringify(o) === JSON.stringify(op)));
    persist();
  },
  clear() {
    queue = [];
    persist();
  },
  size: () => queue.length,
};
