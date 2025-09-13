import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  RefreshControl,
  Platform,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';

import { useChecklistStore } from '../../stores/checklistStore';
import { ChecklistCard } from '../../components/checklist/ChecklistCard';
import { Button } from '../../components/ui/Button';
import { AnalyticsCard } from '../../components/ui/AnalyticsCard';
import { RootStackParamList } from '../../types';

type MyChecklistsNavigationProp = StackNavigationProp<RootStackParamList>;

const MyChecklistsScreen = () => {
  const navigation = useNavigation<MyChecklistsNavigationProp>();
  const { 
    checklists, 
    loading, 
    error, 
    fetchChecklists, 
    deleteChecklist,
    updateChecklist,
    loadFromStorage 
  } = useChecklistStore();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadFromStorage();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChecklists();
    setRefreshing(false);
  };

  const handleChecklistPress = useCallback((checklistId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ChecklistDetail', { id: checklistId });
  }, [navigation]);

  const handleEditTitle = async (checklistId: string, newTitle: string) => {
    try {
      await updateChecklist(checklistId, { title: newTitle });
    } catch (error) {
      Alert.alert('오류', '제목 변경에 실패했습니다.');
    }
  };

  const handleDeleteChecklist = useCallback((checklistId: string, title: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      '체크리스트 삭제',
      `"${title}" 체크리스트를 정말 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            deleteChecklist(checklistId);
          },
        },
      ]
    );
  }, [deleteChecklist]);

  // FlatList 렌더링 최적화
  const renderChecklistCard = useCallback(({ item }) => (
    <ChecklistCard
      checklist={item}
      onPress={() => handleChecklistPress(item.id)}
      onEdit={handleEditTitle}
      showEditButton={true}
    />
  ), [handleChecklistPress, handleEditTitle]);

  const keyExtractor = useCallback((item) => item.id, []);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button 
            title="다시 시도" 
            onPress={fetchChecklists}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {checklists.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>
            아직 체크리스트가 없습니다
          </Text>
          <Text style={styles.emptySubtitle}>
            템플릿을 사용하거나 직접 만들어보세요
          </Text>
          <View style={styles.emptyButtons}>
            <Button
              title="템플릿 보기"
              onPress={() => navigation.navigate('Home' as any)}
              style={styles.emptyButton}
            />
            <Button
              title="직접 만들기"
              onPress={() => navigation.navigate('Create' as any)}
              variant="outline"
              style={styles.emptyButton}
            />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              내 체크리스트 ({checklists.length})
            </Text>
            <Text style={styles.headerSubtitle}>
              완료한 항목들을 체크해보세요
            </Text>
          </View>

          <FlatList
            data={checklists}
            renderItem={renderChecklistCard}
            keyExtractor={keyExtractor}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#DC2626']}
                tintColor="#DC2626"
              />
            }
            ListHeaderComponent={<AnalyticsCard />}
            ListFooterComponent={<View style={styles.bottomPadding} />}
            removeClippedSubviews={true}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={10}
            updateCellsBatchingPeriod={100}
            getItemLayout={(data, index) => ({
              length: 120, // 예상되는 아이템 높이
              offset: 120 * index,
              index,
            })}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      overflow: 'scroll',
      WebkitOverflowScrolling: 'touch',
      maxHeight: 'calc(100vh - 150px)',
    }),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
    ...(Platform.OS === 'web' && {
      paddingBottom: 40,
    }),
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    paddingHorizontal: 20,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
  },
  bottomPadding: {
    height: 20,
  },
});

export default MyChecklistsScreen;