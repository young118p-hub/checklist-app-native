import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useChecklistStore } from './src/stores/checklistStore';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { OfflineNotice } from './src/components/ui/OfflineNotice';
import * as Linking from 'expo-linking';
import { parseSharedChecklist, validateSharedChecklistData } from './src/utils/shareUtils';

export default function App() {
  const { loadFromStorage, createChecklist } = useChecklistStore();
  const [isLoading, setIsLoading] = useState(true);

  const handleDeepLink = async (url: string) => {
    try {
      // Handle import checklist deep link
      if (url.includes('amajdaigeo://import-checklist')) {
        const sharedData = parseSharedChecklist(url);

        if (!sharedData || !validateSharedChecklistData(sharedData)) {
          Alert.alert('오류', '올바른 공유 링크가 아닙니다.');
          return;
        }

        Alert.alert(
          '공유받은 체크리스트',
          `"${sharedData.title}"를 내 체크리스트에 추가하시겠습니까?`,
          [
            { text: '취소', style: 'cancel' },
            {
              text: '추가',
              onPress: async () => {
                try {
                  const checklistData = {
                    title: `${sharedData.title} (공유받음)`,
                    description: sharedData.description || `${sharedData.sharedBy}님이 공유한 체크리스트`,
                    isTemplate: false,
                    isPublic: false,
                    peopleCount: 1,
                    categoryId: undefined,
                    items: sharedData.items.map((item) => ({
                      title: item.title,
                      description: item.description || '',
                      quantity: item.quantity || 1,
                      unit: item.unit || '',
                      order: item.order
                    }))
                  };

                  await createChecklist(checklistData);
                  Alert.alert('성공! 🎉', '공유받은 체크리스트가 추가되었습니다.');
                } catch (error) {
                  Alert.alert('오류', '체크리스트 추가에 실패했습니다.');
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Deep link handling error:', error);
      Alert.alert('오류', '링크 처리에 실패했습니다.');
    }
  };

  useEffect(() => {
    // Load data from AsyncStorage on app start
    const initializeApp = async () => {
      try {
        await loadFromStorage();
        // 최소 1초 로딩 화면 표시 (너무 빨리 사라지는 것 방지)
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Failed to load initial data:', error);
        // 초기 로딩 실패 시에도 앱이 동작하도록 처리
      } finally {
        setIsLoading(false);
      }
    };

    // Handle deep links when app is already running
    const handleUrl = (event: { url: string }) => {
      handleDeepLink(event.url);
    };

    // Handle deep links when app is opened from a deep link
    const getInitialUrl = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    };

    initializeApp();
    getInitialUrl();

    // Add event listener for deep links
    const subscription = Linking.addEventListener('url', handleUrl);

    return () => subscription?.remove();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor="#DC2626" />
        <View style={styles.loadingContent}>
          <Text style={styles.loadingTitle}>아맞다이거! 🤦‍♂️</Text>
          <Text style={styles.loadingSubtitle}>
            깜빡할 뻔한 모든 것들을 한 번에!
          </Text>
          <ActivityIndicator
            size="large"
            color="white"
            style={styles.loadingSpinner}
          />
          <Text style={styles.loadingText}>준비 중...</Text>
        </View>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar style="light" backgroundColor="#DC2626" />
      <AppNavigator />
      <OfflineNotice />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});
