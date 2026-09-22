import { Checklist, ChecklistItem, ChecklistSource, ItemCheck, Member } from '../types';

// ───────────── 서버 행 ─────────────

export interface ChecklistRow {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  people_count: number;
  category_id: string | null;
  source: ChecklistSource | null;
  start_date: string | null;
  cautions: string[] | null;
  created_at?: string;
  updated_at?: string;
  deleted_at: string | null;
}

export interface ItemRow {
  id: string;
  checklist_id: string;
  title: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  sort_order: number;
  key: string | null;
  section: string | null;
  quantity_per_person: number | null;
  scope: 'shared' | 'personal';
  reason: string | null;
  baggage: 'carry_on' | 'checked' | null;
  added_because: string[] | null;
  assignee_user_id: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at: string | null;
}

export interface CheckRow {
  item_id: string;
  member_key: string;
  checklist_id: string;
  checked: boolean;
  checked_at: string;
}

export interface MemberRow {
  checklist_id: string;
  user_id: string;
  role: 'owner' | 'member';
  show_name: boolean;
  color_index: number;
}

export interface KeyRow {
  member_key: string;
  checklist_id: string;
  user_id: string;
}

export interface ProfileRow {
  id: string;
  nickname: string;
}

export interface RemoteSnapshot {
  checklists: ChecklistRow[];
  items: ItemRow[];
  checks: CheckRow[];
  members: MemberRow[];
  keys: KeyRow[];
  profiles: ProfileRow[];
}

// 로그인 전에 쓰던 체크를 서버 키가 생기기 전까지 표시하는 임시 키
export const PENDING_ME = 'pending-me';

const clip = (text: string, max: number) => (text.length > max ? text.slice(0, max) : text);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));
const orNull = <T,>(v: T | undefined | null): T | null => (v === undefined ? null : v);

// ───────────── 로컬 → 서버 ─────────────

export const toChecklistRow = (c: Checklist, ownerId: string): Omit<ChecklistRow, 'deleted_at'> => ({
  id: c.id,
  owner_id: c.remote?.ownerId ?? ownerId,
  title: clip(c.title.trim() || '제목 없음', 100),
  description: orNull(c.description),
  people_count: clamp(c.peopleCount ?? 1, 1, 50),
  category_id: orNull(c.categoryId),
  source: orNull(c.source),
  start_date: orNull(c.source?.startDate),
  cautions: c.cautions && c.cautions.length > 0 ? c.cautions : null,
});

export const toItemRow = (item: ChecklistItem, checklistId: string): Omit<ItemRow, 'deleted_at'> => ({
  id: item.id,
  checklist_id: checklistId,
  title: clip(item.title.trim() || '항목', 100),
  description: item.description || null,
  quantity: item.quantity ?? null,
  unit: item.unit || null,
  sort_order: item.order,
  key: orNull(item.key),
  section: orNull(item.section),
  quantity_per_person: orNull(item.quantityPerPerson),
  scope: item.scope ?? 'shared',
  reason: orNull(item.reason),
  baggage: orNull(item.baggage),
  added_because: item.addedBecause && item.addedBecause.length > 0 ? item.addedBecause : null,
  assignee_user_id: orNull(item.assigneeUserId),
});

// ───────────── 체크 상태 ─────────────

// 같이 챙길 것: 가장 최근에 누른 사람 기준 / 각자 챙길 것: 내 체크
export const deriveCompleted = (
  item: Pick<ChecklistItem, 'scope' | 'checks' | 'isCompleted'>,
  myKey: string | undefined,
): boolean => {
  const checks = item.checks ?? [];
  if (checks.length === 0) return false;
  if (item.scope === 'personal') {
    const mine = checks.find(c => c.memberKey === (myKey ?? PENDING_ME));
    return mine?.checked ?? false;
  }
  return latestCheck(checks)!.checked;
};

// 서버는 '+00:00', 기기는 'Z' 형식이라 문자열이 아니라 시각으로 비교한다
export const checkTime = (c: ItemCheck) => Date.parse(c.checkedAt) || 0;

export const latestCheck = (checks: ItemCheck[]): ItemCheck | undefined =>
  checks.reduce<ItemCheck | undefined>((best, c) => (!best || checkTime(c) > checkTime(best) ? c : best), undefined);

export const upsertCheck = (checks: ItemCheck[] | undefined, next: ItemCheck): ItemCheck[] => [
  ...(checks ?? []).filter(c => c.memberKey !== next.memberKey),
  next,
];

// ───────────── 서버 → 로컬 ─────────────

export const toMembers = (
  checklistId: string,
  snapshot: Pick<RemoteSnapshot, 'members' | 'keys' | 'profiles'>,
  myUserId: string,
): Member[] => {
  const nick = new Map(snapshot.profiles.map(p => [p.id, p.nickname]));
  const keys = new Map(snapshot.keys.filter(k => k.checklist_id === checklistId).map(k => [k.user_id, k.member_key]));
  return snapshot.members
    .filter(m => m.checklist_id === checklistId)
    .map(m => ({
      userId: m.user_id,
      nickname: nick.get(m.user_id) || '',
      role: m.role,
      showName: m.show_name,
      colorIndex: m.color_index,
      memberKey: keys.get(m.user_id),
      isMe: m.user_id === myUserId,
    }))
    .sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0));
};

export const fromItemRow = (row: ItemRow, checks: ItemCheck[], myKey: string | undefined, local?: ChecklistItem): ChecklistItem => {
  const item: ChecklistItem = {
    id: row.id,
    checklistId: row.checklist_id,
    title: row.title,
    description: row.description ?? '',
    quantity: row.quantity ?? 1,
    unit: row.unit ?? '',
    order: row.sort_order,
    key: row.key ?? undefined,
    section: row.section ?? undefined,
    quantityPerPerson: row.quantity_per_person ?? undefined,
    scope: row.scope,
    reason: row.reason ?? undefined,
    baggage: row.baggage ?? undefined,
    addedBecause: row.added_because ?? undefined,
    assigneeUserId: row.assignee_user_id ?? undefined,
    checks,
    isCompleted: false,
    createdAt: local?.createdAt ?? (row.created_at ? new Date(row.created_at) : new Date()),
    updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
  };
  item.isCompleted = deriveCompleted(item, myKey);
  return item;
};

export const checksFromRows = (rows: CheckRow[]): Map<string, ItemCheck[]> => {
  const map = new Map<string, ItemCheck[]>();
  for (const r of rows) {
    map.set(r.item_id, [...(map.get(r.item_id) ?? []), { memberKey: r.member_key, checked: r.checked, checkedAt: r.checked_at }]);
  }
  return map;
};
