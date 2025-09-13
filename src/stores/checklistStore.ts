import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Checklist, CreateChecklistData, ChecklistItem, SmartNotification } from '../types';
import { generateUUID } from '../utils/uuid';
import { SmartNotificationSystem } from '../utils/smartNotifications';

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
  createChecklist: (data: CreateChecklistData) => Promise<void>;
  updateChecklist: (id: string, data: Partial<Checklist>) => Promise<void>;
  deleteChecklist: (id: string) => Promise<void>;
  
  toggleItemComplete: (itemId: string) => void;
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
      
      // 스마트 알림 생성 (체크리스트 생성 후)
      await get().generateSmartNotifications(newChecklist);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  updateChecklist: async (id: string, data: Partial<Checklist>) => {
    set({ loading: true, error: null });
    try {
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
      set((state) => ({
        checklists: state.checklists.filter(c => c.id !== id),
        currentChecklist: state.currentChecklist?.id === id ? null : state.currentChecklist,
        loading: false
      }));
      await get().saveToStorage();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  toggleItemComplete: (itemId: string) => {
    set((state) => {
      if (!state.currentChecklist) return state;
      
      const updatedItems = state.currentChecklist.items.map(item =>
        item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
      );
      
      const updatedChecklist = {
        ...state.currentChecklist,
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
    setTimeout(() => get().saveToStorage(), 100);
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
      };

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
    get().saveToStorage();
  },

  clearAllNotifications: () => {
    set({ notifications: [] });
    get().saveToStorage();
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
        set({ 
          checklists: data.checklists || [], 
          analytics: data.analytics || [],
          notifications: data.notifications || []
        });
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
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