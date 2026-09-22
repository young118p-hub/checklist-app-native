import { Checklist, ChecklistItem, ItemCheck } from '../types';
import {
  PENDING_ME, RemoteSnapshot, checksFromRows, deriveCompleted, fromItemRow, toMembers, upsertCheck,
} from './mapping';

export interface MergeResult {
  checklists: Checklist[];
  removedIds: string[];   // 서버에서 사라진 리스트 (삭제됐거나 내보내짐) → 알림 취소용
}

// 서버 스냅샷을 기기 리스트에 합친다.
// 아직 못 보낸 변경(pendingKeys)이 있는 대상은 기기 쪽을 그대로 둔다 (보내고 나면 다음 pull에서 맞춰짐).
export const mergeSnapshot = (
  local: Checklist[],
  snapshot: RemoteSnapshot,
  myUserId: string,
  pendingKeys: Set<string>,
  now = new Date(),
): MergeResult => {
  const localById = new Map(local.map(c => [c.id, c]));
  const checksByItem = checksFromRows(snapshot.checks);
  const live = snapshot.checklists.filter(r => !r.deleted_at);
  const liveIds = new Set(live.map(r => r.id));
  const removedIds: string[] = [];

  const merged: Checklist[] = live.map(row => {
    const prev = localById.get(row.id);
    const members = toMembers(row.id, snapshot, myUserId);
    const myKey = members.find(m => m.isMe)?.memberKey;
    const keepBase = prev && pendingKeys.has(`c:${row.id}`);

    const rowsForList = snapshot.items.filter(i => i.checklist_id === row.id);
    const rowIds = new Set(rowsForList.map(i => i.id));
    const prevItems = new Map((prev?.items ?? []).map(i => [i.id, i]));

    const items: ChecklistItem[] = [];
    for (const itemRow of rowsForList) {
      const localItem = prevItems.get(itemRow.id);
      const itemPending = pendingKeys.has(`i:${itemRow.id}`);
      if (itemRow.deleted_at) {
        // 다른 사람이 지웠어도 내가 방금 고친 게 있으면 남긴다 (보내면 되살아남)
        if (itemPending && localItem) items.push(localItem);
        continue;
      }
      if (itemPending && localItem) {
        items.push(localItem);
        continue;
      }
      let checks: ItemCheck[] = checksByItem.get(itemRow.id) ?? [];
      if (pendingKeys.has(`k:${itemRow.id}`) && localItem) {
        const mine = localItem.checks?.find(c => c.memberKey === myKey || c.memberKey === PENDING_ME);
        if (mine) checks = upsertCheck(checks, { ...mine, memberKey: myKey ?? PENDING_ME });
      }
      items.push(fromItemRow(itemRow, checks, myKey, localItem));
    }
    // 기기에서 새로 만들고 아직 못 보낸 항목
    for (const item of prev?.items ?? []) {
      if (!rowIds.has(item.id) && pendingKeys.has(`i:${item.id}`)) items.push(item);
    }
    items.sort((a, b) => a.order - b.order);
    // 임시 키로 들고 있던 내 체크를 실제 키로 바꾼다
    if (myKey) {
      for (const item of items) {
        if (item.checks?.some(c => c.memberKey === PENDING_ME)) {
          item.checks = item.checks.map(c => (c.memberKey === PENDING_ME ? { ...c, memberKey: myKey } : c));
          item.isCompleted = deriveCompleted(item, myKey);
        }
      }
    }

    const base: Checklist = keepBase
      ? prev!
      : {
        ...(prev ?? {
          isTemplate: false,
          isPublic: false,
          createdAt: row.created_at ? new Date(row.created_at) : now,
          user: { id: row.owner_id, email: '' },
          category: null,
          _count: { likes: 0, reviews: 0, comments: 0 },
        } as Checklist),
        id: row.id,
        title: row.title,
        description: row.description ?? undefined,
        peopleCount: row.people_count,
        categoryId: row.category_id ?? undefined,
        source: row.source ?? undefined,
        cautions: row.cautions ?? undefined,
        userId: row.owner_id,
        updatedAt: row.updated_at ? new Date(row.updated_at) : now,
      };

    return {
      ...base,
      items,
      remote: { ownerId: row.owner_id, myMemberKey: myKey, members, syncedAt: now.toISOString() },
    };
  });

  // 서버에 없는 기기 리스트
  const rest: Checklist[] = [];
  for (const c of local) {
    if (liveIds.has(c.id)) continue;
    if (pendingKeys.has(`c:${c.id}`)) rest.push(c);       // 아직 올리는 중
    else if (c.remote) removedIds.push(c.id);             // 서버에서 사라짐 (삭제·내보내짐)
    else rest.push(c);                                    // 한 번도 올린 적 없음
  }

  // 원래 순서(최근 만든 것 먼저)를 최대한 유지하고, 새로 받은 리스트는 앞에
  const order = new Map(local.map((c, i) => [c.id, i]));
  const all = [...merged, ...rest].sort((a, b) => (order.get(a.id) ?? -1) - (order.get(b.id) ?? -1));
  return { checklists: all, removedIds };
};
