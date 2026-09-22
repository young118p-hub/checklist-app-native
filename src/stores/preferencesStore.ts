import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

interface PreferencesState {
  themeMode: ThemeMode;
  // 날짜를 정한 리스트에 출발 전날 오후 8시 알림을 기본으로 켤지
  reminderDefault: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
  setReminderDefault: (on: boolean) => void;
}

const KEY = 'preferences';

export const usePreferencesStore = create<PreferencesState>((set, get) => {
  const save = () => {
    const { themeMode, reminderDefault } = get();
    AsyncStorage.setItem(KEY, JSON.stringify({ themeMode, reminderDefault }))
      .catch(e => console.error('Failed to save preferences:', e));
  };

  return {
    themeMode: 'system',
    reminderDefault: true,
    loaded: false,
    load: async () => {
      try {
        const stored = await AsyncStorage.getItem(KEY);
        if (stored) {
          const data = JSON.parse(stored);
          set({
            themeMode: ['system', 'light', 'dark'].includes(data.themeMode) ? data.themeMode : 'system',
            reminderDefault: typeof data.reminderDefault === 'boolean' ? data.reminderDefault : true,
          });
        }
      } catch (e) {
        console.error('Failed to load preferences:', e);
      } finally {
        set({ loaded: true });
      }
    },
    setThemeMode: (themeMode) => { set({ themeMode }); save(); },
    setReminderDefault: (reminderDefault) => { set({ reminderDefault }); save(); },
  };
});
