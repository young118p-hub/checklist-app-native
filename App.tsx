import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useChecklistStore } from './src/stores/checklistStore';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';

export default function App() {
  const { loadFromStorage } = useChecklistStore();

  useEffect(() => {
    // Load data from AsyncStorage on app start
    const initializeApp = async () => {
      try {
        await loadFromStorage();
      } catch (error) {
        console.error('Failed to load initial data:', error);
        // 초기 로딩 실패 시에도 앱이 동작하도록 처리
      }
    };

    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar style="light" backgroundColor="#DC2626" />
      <AppNavigator />
    </ErrorBoundary>
  );
}
