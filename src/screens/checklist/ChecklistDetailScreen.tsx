import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useChecklistStore } from '../../stores/checklistStore';
import { ChecklistItemComponent } from '../../components/checklist/ChecklistItem';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EditableTitle } from '../../components/ui/EditableTitle';
import { CelebrationModal } from '../../components/ui/CelebrationModal';
import { SmartRecommendations } from '../../components/ui/SmartRecommendations';
import { EnhancedShareModal } from '../../components/ui/EnhancedShareModal';
import { RootStackParamList } from '../../types';

type ChecklistDetailRouteProp = RouteProp<RootStackParamList, 'ChecklistDetail'>;
type ChecklistDetailNavigationProp = StackNavigationProp<RootStackParamList>;

const ChecklistDetailScreen = () => {
  const route = useRoute<ChecklistDetailRouteProp>();
  const navigation = useNavigation<ChecklistDetailNavigationProp>();
  const insets = useSafeAreaInsets();
  const { id } = route.params;

  const {
    currentChecklist,
    loading,
    error,
    fetchChecklist,
    toggleItemComplete,
    deleteChecklist,
    updateChecklist,
    addItem,
    deleteItem,
    trackChecklistCompletion
  } = useChecklistStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [previousCompletionRate, setPreviousCompletionRate] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchChecklist(id);
  }, [id]);

  useEffect(() => {
    if (currentChecklist) {
      navigation.setOptions({
        title: currentChecklist.title,
      });
    }
  }, [currentChecklist, navigation]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchChecklist(id);
    setRefreshing(false);
  };

  const handleShare = () => {
    if (!currentChecklist) return;
    setShowShareModal(true);
  };

  const handleTitleSave = async (newTitle: string) => {
    if (!currentChecklist) return;
    
    try {
      await updateChecklist(currentChecklist.id, { title: newTitle });
      navigation.setOptions({ title: newTitle });
    } catch (error) {
      Alert.alert('오류', '제목 변경에 실패했습니다.');
    }
  };

  const handleItemToggle = async (itemId: string) => {
    if (!currentChecklist) return;

    const item = currentChecklist.items.find(i => i.id === itemId);
    if (!item) return;

    const totalItems = currentChecklist.items.length;
    // Compute expected count based on current state + toggle direction
    const oldCompletedCount = currentChecklist.items.filter(i => i.isCompleted).length;
    const newCompletedCount = item.isCompleted
      ? oldCompletedCount - 1  // unchecking
      : oldCompletedCount + 1; // checking

    toggleItemComplete(itemId);

    const completionRate = Math.round((newCompletedCount / totalItems) * 100);

    // 완료율이 증가했고, 특정 threshold를 처음 넘었을 때만 축하 모달 표시
    if (newCompletedCount > oldCompletedCount && (
      (completionRate === 100 && previousCompletionRate < 100) ||
      (completionRate >= 80 && previousCompletionRate < 80) ||
      (completionRate >= 50 && previousCompletionRate < 50)
    )) {
      setTimeout(() => setShowCelebration(true), 300);

      // 100% 완료 시 analytics 기록
      if (completionRate === 100) {
        const updatedChecklist = useChecklistStore.getState().currentChecklist;
        if (updatedChecklist) {
          trackChecklistCompletion(updatedChecklist);
        }
      }
    }

    // Only update previousCompletionRate when increasing to prevent re-triggering
    if (completionRate > previousCompletionRate) {
      setPreviousCompletionRate(completionRate);
    }
  };

  const getNextOrder = () => {
    if (!currentChecklist || currentChecklist.items.length === 0) return 0;
    return Math.max(...currentChecklist.items.map(i => i.order)) + 1;
  };

  const handleAddRecommendation = async (title: string, description: string) => {
    if (!currentChecklist) return;

    try {
      await addItem(currentChecklist.id, {
        title,
        description,
        quantity: 1,
        unit: '',
        order: getNextOrder(),
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      Alert.alert('추가됨! 🎉', `"${title}"가 체크리스트에 추가되었습니다.`);
    } catch (error) {
      Alert.alert('오류', '항목 추가에 실패했습니다.');
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (!currentChecklist) return;
    
    const item = currentChecklist.items.find(item => item.id === itemId);
    if (!item) return;
    
    Alert.alert(
      '항목 삭제',
      `"${item.title}"를 정말 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => deleteItem(itemId),
        },
      ]
    );
  };

  const handleAddNewItem = async () => {
    if (!currentChecklist) return;
    
    const trimmedTitle = newItemTitle.trim();
    if (!trimmedTitle) {
      Alert.alert('오류', '항목 이름을 입력해주세요.');
      return;
    }
    
    try {
      await addItem(currentChecklist.id, {
        title: trimmedTitle,
        description: newItemDescription.trim(),
        quantity: 1,
        unit: '',
        order: getNextOrder(),
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      setNewItemTitle('');
      setNewItemDescription('');
      setShowAddForm(false);
      Alert.alert('추가됨! 🎉', `"${trimmedTitle}"가 추가되었습니다.`);
    } catch (error) {
      Alert.alert('오류', '항목 추가에 실패했습니다.');
    }
  };

  const handleDelete = () => {
    if (!currentChecklist) return;

    Alert.alert(
      '체크리스트 삭제',
      `"${currentChecklist.title}" 체크리스트를 정말 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await deleteChecklist(currentChecklist.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  if (loading && !currentChecklist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentChecklist) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || '체크리스트를 찾을 수 없습니다.'}
          </Text>
          <Button 
            title="다시 시도" 
            onPress={() => fetchChecklist(id)}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const completedItems = currentChecklist.items.filter(item => item.isCompleted);
  const totalItems = currentChecklist.items.length;
  const progress = totalItems > 0 ? (completedItems.length / totalItems) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <Card style={styles.progressCard}>
        {/* Editable Title */}
        <EditableTitle
          title={currentChecklist.title}
          onSave={handleTitleSave}
          style={styles.editableTitle}
        />
        
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>진행률</Text>
          <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
        </View>
        
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { width: `${progress}%` }]} 
          />
        </View>
        
        <Text style={styles.progressText}>
          {completedItems.length}/{totalItems} 항목 완료
        </Text>
        
        {currentChecklist.description && (
          <Text style={styles.description}>
            {currentChecklist.description}
          </Text>
        )}
      </Card>

      {/* Items List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Smart AI Recommendations */}
        <SmartRecommendations
          currentItems={currentChecklist.items}
          templateCategory={currentChecklist.categoryId}
          onAddRecommendation={handleAddRecommendation}
        />

        {currentChecklist.items
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <ChecklistItemComponent
              key={item.id}
              item={item}
              onToggle={handleItemToggle}
              onDelete={handleDeleteItem}
              showDeleteButton={true}
            />
          ))}

        {/* Add New Item Section */}
        <View style={styles.addSection}>
          {!showAddForm ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddForm(true)}
            >
              <Text style={styles.addButtonText}>+ 항목 추가</Text>
            </TouchableOpacity>
          ) : (
            <Card style={styles.addForm}>
              <Text style={styles.addFormTitle}>새 항목 추가</Text>
              
              <TextInput
                style={styles.addInput}
                placeholder="항목 이름 (필수)"
                value={newItemTitle}
                onChangeText={setNewItemTitle}
                autoFocus
                maxLength={50}
              />
              
              <TextInput
                style={[styles.addInput, styles.addInputDescription]}
                placeholder="설명 (선택)"
                value={newItemDescription}
                onChangeText={setNewItemDescription}
                multiline
                maxLength={100}
              />
              
              <View style={styles.addFormButtons}>
                <TouchableOpacity
                  style={styles.addCancelButton}
                  onPress={() => {
                    setShowAddForm(false);
                    setNewItemTitle('');
                    setNewItemDescription('');
                  }}
                >
                  <Text style={styles.addCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addConfirmButton}
                  onPress={handleAddNewItem}
                >
                  <Text style={styles.addConfirmText}>추가</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        </View>
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionButtons, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title="공유하기"
          onPress={handleShare}
          variant="outline"
          style={styles.actionButton}
        />
        <Button
          title="삭제"
          onPress={handleDelete}
          variant="outline"
          style={StyleSheet.flatten([styles.actionButton, styles.deleteButton])}
          textStyle={styles.deleteButtonText}
        />
      </View>

      {/* Celebration Modal */}
      <CelebrationModal
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
        checklistTitle={currentChecklist.title}
        completionRate={Math.round(progress)}
      />

      {/* Enhanced Share Modal */}
      <EnhancedShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        checklist={currentChecklist}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  progressCard: {
    margin: 16,
    marginBottom: 8,
  },
  editableTitle: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '800',
    color: '#DC2626',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    borderColor: '#DC2626',
  },
  deleteButtonText: {
    color: '#DC2626',
  },
  bottomPadding: {
    height: 20,
  },
  addSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  addForm: {
    padding: 16,
  },
  addFormTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  addInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  addInputDescription: {
    height: 80,
    textAlignVertical: 'top',
  },
  addFormButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  addCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  addConfirmButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ChecklistDetailScreen;