import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Checklist, CreateChecklistData, ChecklistItem, RemoteInfo, SmartNotification } from '../types';
import { outbox } from '../sync/outbox';
import { PENDING_ME, deriveCompleted, upsertCheck } from '../sync/mapping';
import { generateUUID } from '../utils/uuid';
import { SmartNotificationSystem } from '../utils/smartNotifications';
import { cancelReminder, scheduleReminder } from '../utils/reminders';

interface ItemAnalytics {
  title: string;
  missCount: number;
  totalSeen: number;
  missRate: number;
  lastMissed: Date;
}

interface ChecklistState {
  checklists: Checklist[];
  currentChecklist: Checklist | null;
  loading: boolean;
  error: string | null;
  analytics: ItemAnalytics[];
  notifications: SmartNotification[];
  
  // Actions
  fetchChecklists: () => Promise<void>;
  fetchChecklist: (id: string) => Promise<void>;
  createChecklist: (data: CreateChecklistData) => Promise<string | undefined>;
  resetChecklist: (id: string) => Promise<void>;
  setReminder: (id: string, on: boolean) => Promise<boolean>;
  updateChecklist: (id: string, data: Partial<Checklist>) => Promise<void>;
  deleteChecklist: (id: string) => Promise<void>;
  
  toggleItemComplete: (itemId: string) => void;
  setAssignee: (itemId: string, userId: string | undefined) => Promise<void>;

  // 동기화 (src/sync/engine.ts에서 호출)
  applySyncedLists: (lists: Checklist[], removedIds: string[]) => Promise<void>;
  setRemote: (id: string, remote: Omit<RemoteInfo, 'syncedAt'>) => void;
  adoptLocalChecks: () => void;
  detachRemote: (myUserId: string) => Promise<void>;
  addItem: (checklistId: string, item: Omit<ChecklistItem, 'id' | 'checklistId'>) => Promise<void>;
  updateItem: (itemId: string, data: Partial<ChecklistItem>) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  
  // Analytics
  trackChecklistCompletion: (checklist: Checklist) => Promise<void>;
  getFrequentlyMissedItems: () => ItemAnalytics[];
  
  // Notifications
  addNotification: (notification: SmartNotification) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
  generateSmartNotifications: (checklist: Checklist) => Promise<void>;
  getUnreadNotificationCount: () => number;
  
  setError: (error: string | null) => void;
  
  // Persistence
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  checklists: [],
  currentChecklist: null,
  loading: false,
  error: null,
  analytics: [],
  notifications: [],

  fetchChecklists: async () => {
    set({ loading: true, error: null });
    await get().loadFromStorage();
    set({ loading: false });
  },

  fetchChecklist: async (id: string) => {
    set({ loading: true, error: null });
    const state = get();
    const checklist = state.checklists.find(c => c.id === id);
    if (checklist) {
      set({ currentChecklist: checklist, loading: false });
    } else {
      set({ error: 'Checklist not found', loading: false });
    }
  },

  createChecklist: async (data: CreateChecklistData) => {
    set({ loading: true, error: null });
    try {
      const newChecklist: Checklist = {
        id: generateUUID(),
        title: data.title,
        description: data.description,
        isTemplate: data.isTemplate || false,
        isPublic: data.isPublic || false,
        peopleCount: data.peopleCount || 1,
        userId: 'local-user',
        categoryId: data.categoryId,
        source: data.source,
        cautions: data.cautions && data.cautions.length > 0 ? data.cautions : undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'local-user', email: '', name: 'Local User' },
        category: null,
        items: data.items.map((item, index) => ({
          id: generateUUID(),
          checklistId: '',
          title: item.title,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || '',
          isCompleted: false,
          order: index,
          createdAt: new Date(),
          updatedAt: new Date(),
          key: item.key,
          section: item.section,
          quantityPerPerson: item.quantityPerPerson,
          scope: item.scope,
          reason: item.reason,
          baggage: item.baggage,
          addedBecause: item.addedBecause,
        })),
        _count: { likes: 0, reviews: 0, comments: 0 }
      };

      // Set checklistId for items
      newChecklist.items.forEach(item => {
        item.checklistId = newChecklist.id;
      });

      set((state) => ({
        checklists: [newChecklist, ...state.checklists],
        loading: false
      }));

      await get().saveToStorage();

      outbox.recordMany([
        { kind: 'checklist', id: newChecklist.id },
        ...newChecklist.items.map(i => ({ kind: 'item' as const, checklistId: newChecklist.id, id: i.id })),
      ]);

      if (data.reminder && data.source?.startDate) {
        await get().setReminder(newChecklist.id, true);
      }

      // 스마트 알림 생성 (체크리스트 생성 후)
      await get().generateSmartNotifications(newChecklist);
      return newChecklist.id;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
      return undefined;
    }
  },

  // 다 챙긴 리스트를 다음에 다시 쓰도록 체크만 모두 푼다
  resetChecklist: async (id: string) => {
    const now = new Date();
    const target = get().checklists.find(c => c.id === id);
    const synced = !!target?.remote || outbox.isEnabled();
    const myKey = target?.remote?.myMemberKey ?? PENDING_ME;
    const at = now.toISOString();
    if (target && synced) {
      outbox.recordMany(target.items.filter(i => i.isCompleted)
        .map(i => ({ kind: 'check' as const, checklistId: id, itemId: i.id, checked: false, at })));
    }
    const reset = (c: Checklist): Checklist => ({
      ...c,
      updatedAt: now,
      items: c.items.map(i => (i.isCompleted
        ? {
          ...i, isCompleted: false, updatedAt: now,
          checks: synced ? upsertCheck(i.checks, { memberKey: myKey, checked: false, checkedAt: at }) : i.checks,
        }
        : i)),
    });
    set((state) => ({
      checklists: state.checklists.map(c => (c.id === id ? reset(c) : c)),
      currentChecklist: state.currentChecklist?.id === id ? reset(state.currentChecklist) : state.currentChecklist,
    }));
    await get().saveToStorage();
  },

  // 출발 전날 오후 8시 알림 켜기/끄기. 켜지지 않으면(권한 거절, 이미 지난 날짜) false
  setReminder: async (id: string, on: boolean) => {
    const checklist = get().checklists.find(c => c.id === id);
    if (!checklist) return false;
    await cancelReminder(checklist.reminderId);
    let next: { reminderId?: string; reminderAt?: string } = { reminderId: undefined, reminderAt: undefined };
    const startDate = checklist.source?.startDate;
    if (on && startDate) {
      const scheduled = await scheduleReminder(checklist, startDate).catch(e => {
        console.error('Failed to schedule reminder:', e);
        return null;
      });
      if (scheduled) next = { reminderId: scheduled.id, reminderAt: scheduled.at };
    }
    set((state) => ({
      checklists: state.checklists.map(c => (c.id === id ? { ...c, ...next } : c)),
      currentChecklist: state.currentChecklist?.id === id ? { ...state.currentChecklist, ...next } : state.currentChecklist,
    }));
    await get().saveToStorage();
    return !!next.reminderId;
  },

  updateChecklist: async (id: string, data: Partial<Checklist>) => {
    set({ loading: true, error: null });
    try {
      outbox.record({ kind: 'checklist', id });
      set((state) => {
        const updatedChecklists = state.checklists.map(c => 
          c.id === id ? { ...c, ...data, updatedAt: new Date() } : c
        );
        return {
          checklists: updatedChecklists,
          currentChecklist: state.currentChecklist?.id === id 
            ? { ...state.currentChecklist, ...data, updatedAt: new Date() }
            : state.currentChecklist,
          loading: false
        };
      });
      await get().saveToStorage();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  deleteChecklist: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const deletedChecklist = get().checklists.find(c => c.id === id);
      await cancelReminder(deletedChecklist?.reminderId);
      const mine = !deletedChecklist?.remote || deletedChecklist.remote.members.find(m => m.isMe)?.role === 'owner';
      outbox.record({ kind: 'checklist', id, deleted: mine ? 'delete' : 'leave' });
      const remainingChecklists = get().checklists.filter(c => c.id !== id);

      // 삭제되는 체크리스트의 항목 중, 다른 체크리스트에 없는 항목은 analytics에서 제거
      let newAnalytics = [...get().analytics];
      if (deletedChecklist) {
        const remainingItemTitles = new Set(
          remainingChecklists.flatMap(c => c.items.map(i => i.title))
        );
        newAnalytics = newAnalytics.filter(
          a => remainingItemTitles.has(a.title)
        );
      }

      set({
        checklists: remainingChecklists,
        currentChecklist: get().currentChecklist?.id === id ? null : get().currentChecklist,
        analytics: newAnalytics,
        loading: false,
      });
      await get().saveToStorage();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  toggleItemComplete: (itemId: string) => {
    set((state) => {
      if (!state.currentChecklist) return state;
      
      const now = new Date();
      const list = state.currentChecklist;
      const synced = !!list.remote || outbox.isEnabled();
      const myKey = list.remote?.myMemberKey ?? PENDING_ME;
      const updatedItems = list.items.map(item => {
        if (item.id !== itemId) return item;
        const checked = !item.isCompleted;
        if (!synced) return { ...item, isCompleted: checked, updatedAt: now };
        // 함께 쓰는 리스트는 내 체크를 한 줄 남기고, 완료 여부는 체크들로 다시 계산한다
        const at = now.toISOString();
        outbox.record({ kind: 'check', checklistId: list.id, itemId, checked, at });
        const checks = upsertCheck(item.checks, { memberKey: myKey, checked, checkedAt: at });
        return { ...item, checks, isCompleted: deriveCompleted({ ...item, checks }, myKey), updatedAt: now };
      });

      const updatedChecklist = {
        ...state.currentChecklist,
        updatedAt: now,
        items: updatedItems
      };

      // Also update in main checklists array
      const updatedChecklists = state.checklists.map(c =>
        c.id === state.currentChecklist?.id ? updatedChecklist : c
      );

      return {
        ...state,
        currentChecklist: updatedChecklist,
        checklists: updatedChecklists
      };
    });

    // Save to storage after update
    get().saveToStorage().catch(e => console.error('Failed to save after toggleItemComplete:', e));
  },

  addItem: async (checklistId: string, item: Omit<ChecklistItem, 'id' | 'checklistId'>) => {
    set({ loading: true, error: null });
    try {
      const newItem: ChecklistItem = {
        id: generateUUID(),
        checklistId,
        title: item.title,
        description: item.description || '',
        quantity: item.quantity || 1,
        unit: item.unit || '',
        isCompleted: false,
        order: item.order || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        key: item.key,
        section: item.section,
        quantityPerPerson: item.quantityPerPerson,
        scope: item.scope,
        reason: item.reason,
        baggage: item.baggage,
        addedBecause: item.addedBecause,
      };
      outbox.record({ kind: 'item', checklistId, id: newItem.id });

      set((state) => ({
        currentChecklist: state.currentChecklist ? {
          ...state.currentChecklist,
          items: [...state.currentChecklist.items, newItem]
        } : null,
        checklists: state.checklists.map(c => 
          c.id === checklistId ? {
            ...c,
            items: [...c.items, newItem]
          } : c
        ),
        loading: false
      }));

      await get().saveToStorage();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  updateItem: async (itemId: string, data: Partial<ChecklistItem>) => {
    set({ loading: true, error: null });
    try {
      const owner = get().checklists.find(c => c.items.some(i => i.id === itemId));
      if (owner) outbox.record({ kind: 'item', checklistId: owner.id, id: itemId });
      set((state) => {
        const updateItemInList = (items: ChecklistItem[]) =>
          items.map(item =>
            item.id === itemId ? { ...item, ...data, updatedAt: new Date() } : item
          );

        return {
          currentChecklist: state.currentChecklist ? {
            ...state.currentChecklist,
            items: updateItemInList(state.currentChecklist.items)
          } : null,
          checklists: state.checklists.map(c => ({
            ...c,
            items: updateItemInList(c.items)
          })),
          loading: false
        };
      });

      await get().saveToStorage();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  deleteItem: async (itemId: string) => {
    set({ loading: true, error: null });
    try {
      const owner = get().checklists.find(c => c.items.some(i => i.id === itemId));
      if (owner) outbox.record({ kind: 'item', checklistId: owner.id, id: itemId });
      set((state) => ({
        currentChecklist: state.currentChecklist ? {
          ...state.currentChecklist,
          items: state.currentChecklist.items.filter(item => item.id !== itemId)
        } : null,
        checklists: state.checklists.map(c => ({
          ...c,
          items: c.items.filter(item => item.id !== itemId)
        })),
        loading: false
      }));

      await get().saveToStorage();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  setAssignee: async (itemId: string, userId: string | undefined) => {
    await get().updateItem(itemId, { assigneeUserId: userId });
  },

  applySyncedLists: async (lists: Checklist[], removedIds: string[]) => {
    for (const id of removedIds) {
      await cancelReminder(get().checklists.find(c => c.id === id)?.reminderId);
    }
    set((state) => ({
      checklists: lists,
      currentChecklist: state.currentChecklist
        ? lists.find(c => c.id === state.currentChecklist!.id) ?? null
        : null,
    }));
    await get().saveToStorage();
  },

  setRemote: (id, remote) => {
    const apply = (c: Checklist): Checklist => (c.id === id ? { ...c, remote: { ...c.remote, ...remote } } : c);
    set((state) => ({
      checklists: state.checklists.map(apply),
      currentChecklist: state.currentChecklist ? apply(state.currentChecklist) : null,
    }));
    get().saveToStorage();
  },

  // 로그인 직전까지 체크한 항목을 '내 체크'로 옮겨 둔다 (서버 키를 받으면 실제 키로 바뀜)
  adoptLocalChecks: () => {
    const adopt = (c: Checklist): Checklist => (c.remote ? c : {
      ...c,
      items: c.items.map(i => (i.isCompleted && !i.checks?.length
        ? { ...i, checks: [{ memberKey: PENDING_ME, checked: true, checkedAt: new Date(i.updatedAt).toISOString() }] }
        : i)),
    });
    set((state) => ({
      checklists: state.checklists.map(adopt),
      currentChecklist: state.currentChecklist ? adopt(state.currentChecklist) : null,
    }));
    get().saveToStorage();
  },

  // 로그아웃: 다른 사람이 만든 리스트는 지우고, 내 리스트는 지금 보이는 체크 상태 그대로 기기 전용으로
  detachRemote: async (myUserId: string) => {
    const keep: Checklist[] = [];
    for (const c of get().checklists) {
      if (c.remote && c.remote.ownerId !== myUserId) {
        await cancelReminder(c.reminderId);
        continue;
      }
      keep.push({
        ...c,
        remote: undefined,
        userId: 'local-user',
        items: c.items.map(({ checks: _checks, assigneeUserId: _a, ...i }) => i),
      });
    }
    set((state) => ({
      checklists: keep,
      currentChecklist: state.currentChecklist ? keep.find(c => c.id === state.currentChecklist!.id) ?? null : null,
    }));
    await get().saveToStorage();
  },

  trackChecklistCompletion: async (checklist: Checklist) => {
    const state = get();
    const newAnalytics = [...state.analytics];
    
    checklist.items.forEach(item => {
      const existingIndex = newAnalytics.findIndex(a => a.title === item.title);
      
      if (existingIndex >= 0) {
        // Update existing analytics
        const existing = newAnalytics[existingIndex];
        existing.totalSeen += 1;
        
        if (!item.isCompleted) {
          existing.missCount += 1;
          existing.lastMissed = new Date();
        }
        
        existing.missRate = (existing.missCount / existing.totalSeen) * 100;
      } else {
        // Create new analytics entry
        newAnalytics.push({
          title: item.title,
          missCount: item.isCompleted ? 0 : 1,
          totalSeen: 1,
          missRate: item.isCompleted ? 0 : 100,
          lastMissed: item.isCompleted ? new Date(0) : new Date(),
        });
      }
    });
    
    set({ analytics: newAnalytics });
    await get().saveToStorage();
  },

  getFrequentlyMissedItems: () => {
    const state = get();
    return state.analytics
      .filter(item => item.totalSeen >= 2 && item.missRate >= 30)
      .sort((a, b) => b.missRate - a.missRate)
      .slice(0, 10);
  },

  // Notifications
  addNotification: async (notification: SmartNotification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50) // 최대 50개 유지
    }));
    await get().saveToStorage();
  },

  markNotificationAsRead: (notificationId: string) => {
    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    }));
    get().saveToStorage().catch(e => console.error('Failed to save after markNotificationAsRead:', e));
  },

  clearAllNotifications: () => {
    set({ notifications: [] });
    get().saveToStorage().catch(e => console.error('Failed to save after clearAllNotifications:', e));
  },

  generateSmartNotifications: async (checklist: Checklist) => {
    const state = get();
    
    // 완료율 기반 알림
    const completionNotification = SmartNotificationSystem.createCompletionBasedNotification(checklist);
    if (completionNotification) {
      await get().addNotification(completionNotification);
    }
    
    // 상황별 알림들
    const contextualReminders = SmartNotificationSystem.createContextualReminders(checklist);
    for (const reminder of contextualReminders) {
      await get().addNotification(reminder);
    }
    
    // 자주 놓치는 항목 알림 (가끔)
    if (Math.random() > 0.7 && state.analytics.length > 0) {
      const missedItemsNotification = SmartNotificationSystem.createMissedItemsNotification(state.analytics);
      if (missedItemsNotification) {
        await get().addNotification(missedItemsNotification);
      }
    }
    
    // 계절별 추천 알림 (가끔)
    if (Math.random() > 0.8) {
      const seasonalSuggestion = SmartNotificationSystem.createSeasonalSuggestion();
      await get().addNotification(seasonalSuggestion);
    }
  },

  getUnreadNotificationCount: () => {
    const state = get();
    return state.notifications.filter(n => !n.isRead).length;
  },

  setError: (error: string | null) => set({ error }),

  loadFromStorage: async () => {
    try {
      const stored = await AsyncStorage.getItem('checklist-storage');
      if (stored) {
        const data = JSON.parse(stored);
        // Validate basic structure before applying
        const checklists = Array.isArray(data.checklists) ? data.checklists : [];
        const analytics = Array.isArray(data.analytics) ? data.analytics : [];
        const notifications = Array.isArray(data.notifications) ? data.notifications : [];
        set({ checklists, analytics, notifications });
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
      // Reset to safe defaults on corruption
      set({ checklists: [], analytics: [], notifications: [] });
    }
  },

  saveToStorage: async () => {
    try {
      const { checklists, analytics, notifications } = get();
      await AsyncStorage.setItem('checklist-storage', JSON.stringify({ checklists, analytics, notifications }));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  },
}));