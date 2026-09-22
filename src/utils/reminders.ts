import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { fromISODate } from './format';

// 출발 전날 오후 8시 (사용자 확정값)
export const REMINDER_HOUR = 20;

export const getReminderDate = (startDate: string): Date => {
  const d = fromISODate(startDate);
  d.setDate(d.getDate() - 1);
  d.setHours(REMINDER_HOUR, 0, 0, 0);
  return d;
};

let channelReady = false;
const ensureChannel = async () => {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('dday', {
    name: '출발 전날 알림',
    importance: Notifications.AndroidImportance.HIGH,
  });
  channelReady = true;
};

export const configureNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
};

// 권한이 없으면 한 번 묻는다. 거절하면 false
export const ensurePermission = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
};

export interface ScheduledReminder {
  id: string;
  at: string;
}

export const scheduleReminder = async (
  checklist: { id: string; title: string },
  startDate: string,
): Promise<ScheduledReminder | null> => {
  const at = getReminderDate(startDate);
  if (at.getTime() <= Date.now()) return null;
  if (!(await ensurePermission())) return null;
  await ensureChannel();
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `내일 ${checklist.title}`,
      body: '아맞다! 빠뜨린 건 없는지 확인해 보세요',
      data: { checklistId: checklist.id },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'dday' },
  });
  return { id, at: at.toISOString() };
};

export const cancelReminder = async (id?: string) => {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.error('Failed to cancel reminder:', e);
  }
};
