import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, Linking, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as SystemUI from 'expo-system-ui';
import { AppNavigator, navigationRef } from './src/navigation/AppNavigator';
import { useChecklistStore } from './src/stores/checklistStore';
import { usePreferencesStore } from './src/stores/preferencesStore';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { OfflineNotice } from './src/components/ui/OfflineNotice';
import { parseImportText, sharedToChecklistData } from './src/utils/shareUtils';
import { configureNotifications } from './src/utils/reminders';
import { useColors, useIsDark } from './src/theme';

configureNotifications();

const openChecklist = (id: string) => {
  if (navigationRef.isReady()) navigationRef.navigate('ChecklistDetail', { id });
};

// 앱이 꺼져 있을 때 알림을 눌러 켰으면 화면이 준비된 뒤에 연다
const openFromLastNotification = async () => {
  const response = await Notifications.getLastNotificationResponseAsync().catch(() => null);
  const id = response?.notification.request.content.data?.checklistId;
  if (typeof id === 'string') {
    openChecklist(id);
    Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
  }
};

export default function App() {
  const loadFromStorage = useChecklistStore(s => s.loadFromStorage);
  const createChecklist = useChecklistStore(s => s.createChecklist);
  const loadPreferences = usePreferencesStore(s => s.load);
  const [ready, setReady] = useState(false);
  const dark = useIsDark();
  const c = useColors();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  const handleDeepLink = (url: string) => {
    if (!url.includes('amajdaigeo://import-checklist')) return;
    const shared = parseImportText(url);
    if (!shared) {
      Alert.alert('가져올 수 없는 링크예요', '아맞다이거!에서 공유한 링크인지 확인해 주세요.');
      return;
    }
    Alert.alert('공유받은 리스트', `'${shared.title}'(${shared.items.length}개 항목)을 내 리스트에 추가할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '추가',
        onPress: async () => {
          const id = await createChecklist(sharedToChecklistData(shared));
          if (id) openChecklist(id);
          else Alert.alert('가져오지 못했어요', '잠시 후 다시 시도해 주세요.');
        },
      },
    ]);
  };

  useEffect(() => {
    Promise.all([loadFromStorage(), loadPreferences()])
      .catch(e => console.error('Failed to load initial data:', e))
      .finally(async () => {
        setReady(true);
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) handleDeepLink(initialUrl);
      });

    const linkSub = Linking.addEventListener('url', e => handleDeepLink(e.url));
    // 출발 전날 알림을 누르면 그 리스트를 연다
    const notificationSub = Notifications.addNotificationResponseReceivedListener(response => {
      const id = response.notification.request.content.data?.checklistId;
      if (typeof id === 'string') openChecklist(id);
    });
    return () => {
      linkSub.remove();
      notificationSub.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {ready ? (
        <ErrorBoundary>
          <AppNavigator onReady={openFromLastNotification} />
          <OfflineNotice />
        </ErrorBoundary>
      ) : (
        <View style={{ flex: 1, backgroundColor: c.bg }} />
      )}
    </SafeAreaProvider>
  );
}
