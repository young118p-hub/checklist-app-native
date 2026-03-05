import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useChecklistStore } from '../../stores/checklistStore';
import { ChecklistCard } from '../../components/checklist/ChecklistCard';
import { Button } from '../../components/ui/Button';
import { AnalyticsCard } from '../../components/ui/AnalyticsCard';
import { RootStackParamList, Checklist } from '../../types';
import { useTabSwitch } from '../../navigation/AppNavigator';

type MyChecklistsNavigationProp = StackNavigationProp<RootStackParamList>;

const MyChecklistsScreen = () => {
  const navigation = useNavigation<MyChecklistsNavigationProp>();
  const switchTab = useTabSwitch();
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'completed' | 'incomplete'>('all');

  React.useEffect(() => {
    loadFromStorage();
  }, []
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChecklists();
    setRefreshing(false);
  };

  const handleChecklistPress = useCallback((checklistId: string) => {
    navigation.navigate('ChecklistDetail', { id: checklistId });
  }, [navigation]);

  const handleEditTitle = useCallback(async (checklistId: string, newTitle: string) => {
    try {
      await updateChecklist(checklistId, { title: newTitle });
    } catch (error) {
      Alert.alert('오류', '제목 변경에 실패했습니다.');
    }
  }, [updateChecklist]);

  const handleDeleteChecklist = useCallback((checklistId: string, title: string) => {
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
            deleteChecklist(checklistId);
          },
        },
      ]
    );
  }, [deleteChecklist]);

  // FlatList 렌더링 최적화
  const renderChecklistCard = useCallback(({ item }: { item: Checklist }) => (
    <ChecklistCard
      checklist={item}
      onPress={() => handleChecklistPress(item.id)}
      onEdit={handleEditTitle}
      onDelete={handleDeleteChecklist}
      showEditButton={true}
    />
  ), [handleChecklistPress, handleEditTitle, handleDeleteChecklist]);

  const keyExtractor = useCallback((item: Checklist) => item.id, []);

  // 검색 및 필터링된 체크리스트
  const filteredChecklists = useMemo(() => {
    let filtered = checklists || [];

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(checklist =>
        checklist.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (checklist.description && checklist.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 완료 상태 필터링
    if (filterType !== 'all') {
      filtered = filtered.filter(checklist => {
        const completedItems = checklist.items.filter(item => item.isCompleted).length;
        const totalItems = checklist.items.length;
        const isCompleted = totalItems > 0 && completedItems === totalItems;

        return filterType === 'completed' ? isCompleted : !isCompleted;
      });
    }

    return filtered;
  }, [checklists, searchTerm, filterType]);

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
              onPress={() => switchTab('Home')}
              style={styles.emptyButton}
            />
            <Button
              title="직접 만들기"
              onPress={() => switchTab('Create')}
              variant="outline"
              style={styles.emptyButton}
            />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              내 체크리스트 ({filteredChecklists.length})
            </Text>
            <Text style={styles.headerSubtitle}>
              완료한 항목들을 체크해보세요
            </Text>

            {/* 검색바 */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="체크리스트 검색..."
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 필터 버튼들 */}
            <View style={styles.filterContainer}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterType === 'all' && styles.filterButtonActive
                ]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterType === 'all' && styles.filterButtonTextActive
                ]}>
                  전체
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterType === 'incomplete' && styles.filterButtonActive
                ]}
                onPress={() => setFilterType('incomplete')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterType === 'incomplete' && styles.filterButtonTextActive
                ]}>
                  진행중
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterType === 'completed' && styles.filterButtonActive
                ]}
                onPress={() => setFilterType('completed')}
              >
                <Text style={[
                  styles.filterButtonText,
                  filterType === 'completed' && styles.filterButtonTextActive
                ]}>
                  완료
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={filteredChecklists}
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
            ListEmptyComponent={
              <View style={styles.filteredEmpty}>
                <Text style={styles.filteredEmptyIcon}>🔍</Text>
                <Text style={styles.filteredEmptyText}>
                  {searchTerm ? `"${searchTerm}" 검색 결과가 없습니다` : '해당하는 체크리스트가 없습니다'}
                </Text>
              </View>
            }
            ListFooterComponent={<View style={styles.bottomPadding} />}
            removeClippedSubviews={true}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={10}
            updateCellsBatchingPeriod={100}
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
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
  searchContainer: {
    marginTop: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  filteredEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  filteredEmptyIcon: {
    fontSize: 40,
    marginBottom: 12,
    opacity: 0.5,
  },
  filteredEmptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default MyChecklistsScreen;