import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  Alert,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { SITUATION_TEMPLATES, POPULAR_TEMPLATES, calculateQuantity } from '../../constants/templates';
import { useChecklistStore } from '../../stores/checklistStore';
import { TemplateCard } from '../../components/checklist/TemplateCard';
import { PopularTemplateCard } from '../../components/checklist/PopularTemplateCard';
import { NotificationCenter } from '../../components/ui/NotificationCenter';
import { smartSearch } from '../../utils/smartSearch';
import { parseSharedChecklist, validateSharedChecklistData } from '../../utils/shareUtils';
import { RootStackParamList, SituationTemplate, SmartNotification } from '../../types';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const {
    createChecklist,
    loading,
    notifications,
    getUnreadNotificationCount,
    markNotificationAsRead,
    clearAllNotifications
  } = useChecklistStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importValidation, setImportValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: false, message: '' });

  // People count modal state
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<SituationTemplate | null>(null);
  const [peopleCount, setPeopleCount] = useState(1);

  const createChecklistFromTemplate = useCallback(async (template: SituationTemplate, count: number) => {
    const checklistData = {
      title: template.name,
      description: template.description,
      isTemplate: false,
      isPublic: false,
      peopleCount: count,
      categoryId: template.category,
      items: template.items.map((item, index) => ({
        title: item.title,
        description: item.description || '',
        quantity: template.peopleMultiplier ? calculateQuantity(item, count) : (item.baseQuantity || 1),
        unit: item.unit || '',
        order: index
      }))
    };

    try {
      await createChecklist(checklistData);
      Alert.alert(
        '체크리스트 생성 완료!',
        `${template.name} 체크리스트가 생성되었습니다.${count > 1 ? ` (${count}명 기준)` : ''}`,
        [
          {
            text: '확인',
            onPress: () => navigation.navigate('MyChecklists'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('오류', '체크리스트 생성에 실패했습니다.');
    }
  }, [createChecklist, navigation]);

  const handleUseTemplate = useCallback(async (templateId: string) => {
    const template = SITUATION_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    if (template.peopleMultiplier) {
      // Show people count modal
      setPendingTemplate(template);
      setPeopleCount(1);
      setShowPeopleModal(true);
    } else {
      // Create directly with 1 person
      await createChecklistFromTemplate(template, 1);
    }
  }, [createChecklistFromTemplate]);

  const handlePeopleModalConfirm = useCallback(async () => {
    if (!pendingTemplate) return;
    setShowPeopleModal(false);
    await createChecklistFromTemplate(pendingTemplate, peopleCount);
    setPendingTemplate(null);
  }, [pendingTemplate, peopleCount, createChecklistFromTemplate]);

  const handleNotificationPress = (notification: SmartNotification) => {
    if (notification.actionData) {
      switch (notification.actionData.type) {
        case 'open_checklist':
          if (notification.actionData.checklistId) {
            navigation.navigate('ChecklistDetail', { id: notification.actionData.checklistId });
          }
          break;
        case 'view_my_checklists':
          navigation.navigate('MyChecklists');
          break;
        case 'browse_templates':
          setSearchTerm('');
          break;
      }
    }
    setShowNotificationCenter(false);
  };

  const validateImportText = (text: string) => {
    if (!text.trim()) {
      setImportValidation({ isValid: false, message: '' });
      return;
    }

    try {
      const sharedData = parseSharedChecklist(text.trim());
      if (!sharedData || !validateSharedChecklistData(sharedData)) {
        setImportValidation({
          isValid: false,
          message: '올바른 공유 데이터가 아닙니다. 아맞다이거! 앱에서 생성된 공유 링크를 입력해 주세요.'
        });
        return;
      }

      setImportValidation({
        isValid: true,
        message: `"${sharedData.title}" 체크리스트를 가져올 수 있습니다.`
      });
    } catch (error) {
      setImportValidation({
        isValid: false,
        message: '데이터 형식이 올바르지 않습니다.'
      });
    }
  };

  const handleImportTextChange = (text: string) => {
    setImportText(text);
    validateImportText(text);
  };

  const handleImportSharedChecklist = async () => {
    if (!importText.trim()) {
      Alert.alert('오류', '공유받은 텍스트를 입력해 주세요.');
      return;
    }

    try {
      const sharedData = parseSharedChecklist(importText.trim());

      if (!sharedData || !validateSharedChecklistData(sharedData)) {
        Alert.alert('오류', '올바른 공유 데이터가 아닙니다. 아맞다이거! 앱에서 생성된 공유 링크나 데이터를 입력해 주세요.');
        return;
      }

      // 공유받은 데이터를 체크리스트로 변환
      const checklistData = {
        title: `${sharedData.title} (공유받음)`,
        description: sharedData.description || `${sharedData.sharedBy}님이 공유한 체크리스트`,
        isTemplate: false,
        isPublic: false,
        peopleCount: 1,
        categoryId: undefined,
        items: sharedData.items.map((item, index) => ({
          title: item.title,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit: item.unit || '',
          order: item.order
        }))
      };

      await createChecklist(checklistData);

      setShowImportModal(false);
      setImportText('');
      setImportValidation({ isValid: false, message: '' });

      Alert.alert(
        '성공!',
        '공유받은 체크리스트가 내 체크리스트에 추가되었습니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.navigate('MyChecklists'),
          },
        ]
      );
    } catch (error) {
      console.error('Import checklist error:', error);

      let errorMessage = '공유받은 체크리스트 가져오기에 실패했습니다.';

      if (error instanceof Error) {
        if (error.message.includes('network')) {
          errorMessage += ' 네트워크 연결을 확인해 주세요.';
        } else if (error.message.includes('storage')) {
          errorMessage += ' 저장 공간을 확인해 주세요.';
        } else {
          errorMessage += ' 잠시 후 다시 시도해 주세요.';
        }
      }

      Alert.alert('가져오기 실패', errorMessage);
    }
  };

  // 스마트 검색 적용 (useMemo로 최적화)
  const filteredTemplates = useMemo(() =>
    searchTerm
      ? smartSearch(SITUATION_TEMPLATES, searchTerm)
      : SITUATION_TEMPLATES,
    [searchTerm]
  );

  const popularTemplates = useMemo(() =>
    POPULAR_TEMPLATES.map(templateId =>
      SITUATION_TEMPLATES.find(t => t.id === templateId)
    ).filter((t): t is SituationTemplate => t !== undefined),
    []
  );

  const regularTemplates = useMemo(() =>
    filteredTemplates.filter(template =>
      !POPULAR_TEMPLATES.includes(template.id)
    ),
    [filteredTemplates]
  );

  // FlatList 렌더링 최적화
  const renderTemplateCard = useCallback(({ item }: { item: SituationTemplate }) => (
    <TemplateCard
      template={item}
      onUseTemplate={handleUseTemplate}
      loading={loading}
    />
  ), [handleUseTemplate, loading]);

  const renderPopularCard = useCallback(({ item }: { item: SituationTemplate }) => (
    <PopularTemplateCard
      template={item}
      onUseTemplate={handleUseTemplate}
      loading={loading}
    />
  ), [handleUseTemplate, loading]);

  const keyExtractor = useCallback((item: SituationTemplate) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>아맞다이거!</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.importButton}
              onPress={() => setShowImportModal(true)}
            >
              <Ionicons
                name="download"
                size={20}
                color="white"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setShowNotificationCenter(true)}
            >
              <Ionicons
                name="notifications"
                size={24}
                color="white"
              />
              {(() => {
                const unreadCount = getUnreadNotificationCount();
                return unreadCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount}
                    </Text>
                  </View>
                ) : null;
              })()}
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>
          깜빡할 뻔한 모든 것들을 한 번에! 로그인 없이 바로 사용하세요
        </Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✨ 인원별 자동 계산</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🇰🇷 한국 상황 특화</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>📤 체크리스트 공유</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="어떤 준비를 하시나요? (예: 회사, 병원, 아픈, ㅊㅈ...)"
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#9CA3AF"
        />
        {searchTerm && (
          <View style={styles.searchResultContainer}>
            <Text style={styles.searchResult}>
              "{searchTerm}" 검색 결과: {filteredTemplates.length}개 템플릿
            </Text>
            {filteredTemplates.length > 0 && (
              <Text style={styles.searchHint}>
                동의어, 초성 검색 지원 (예: "ㅊㅈ" → 출장)
              </Text>
            )}
          </View>
        )}
      </View>

      {/* All Templates List */}
      <View style={styles.scrollView}>
        {filteredTemplates.length === 0 && searchTerm ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>
              "{searchTerm}" 검색 결과가 없습니다
            </Text>
            <Text style={styles.emptySubtitle}>
              다른 키워드로 검색해보시거나 직접 만들어보세요
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchTerm ? filteredTemplates : regularTemplates}
            renderItem={renderTemplateCard}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            removeClippedSubviews={true}
            initialNumToRender={6}
            maxToRenderPerBatch={4}
            windowSize={10}
            updateCellsBatchingPeriod={100}
            ListHeaderComponent={!searchTerm ? (
              <>
                <View style={styles.popularSection}>
                  <Text style={styles.sectionTitle}>인기 템플릿</Text>
                  <FlatList
                    data={popularTemplates}
                    renderItem={renderPopularCard}
                    keyExtractor={keyExtractor}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.popularScrollContainer}
                    removeClippedSubviews={true}
                    initialNumToRender={3}
                    maxToRenderPerBatch={2}
                    windowSize={5}
                  />
                </View>
                <Text style={styles.sectionTitle}>모든 템플릿</Text>
              </>
            ) : undefined}
          />
        )}
      </View>

      <NotificationCenter
        visible={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
        notifications={notifications}
        onNotificationPress={handleNotificationPress}
        onMarkAsRead={markNotificationAsRead}
        onClearAll={clearAllNotifications}
      />

      {/* People Count Modal */}
      <Modal
        visible={showPeopleModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPeopleModal(false)}
      >
        <View style={styles.peopleModalOverlay}>
          <View style={styles.peopleModalContainer}>
            <Text style={styles.peopleModalTitle}>인원 수 설정</Text>
            <Text style={styles.peopleModalDescription}>
              {pendingTemplate?.name}에 참여하는 인원 수를 선택해주세요.{'\n'}
              인원에 맞게 수량이 자동 계산됩니다.
            </Text>

            <View style={styles.peopleCounterContainer}>
              <TouchableOpacity
                style={[styles.peopleCounterButton, peopleCount <= 1 && styles.peopleCounterButtonDisabled]}
                onPress={() => peopleCount > 1 && setPeopleCount(prev => prev - 1)}
                disabled={peopleCount <= 1}
              >
                <Text style={[styles.peopleCounterButtonText, peopleCount <= 1 && styles.peopleCounterButtonTextDisabled]}>-</Text>
              </TouchableOpacity>
              <View style={styles.peopleCountDisplay}>
                <Text style={styles.peopleCountNumber}>{peopleCount}</Text>
                <Text style={styles.peopleCountUnit}>명</Text>
              </View>
              <TouchableOpacity
                style={[styles.peopleCounterButton, peopleCount >= 100 && styles.peopleCounterButtonDisabled]}
                onPress={() => peopleCount < 100 && setPeopleCount(prev => prev + 1)}
                disabled={peopleCount >= 100}
              >
                <Text style={[styles.peopleCounterButtonText, peopleCount >= 100 && styles.peopleCounterButtonTextDisabled]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Quick select buttons */}
            <View style={styles.quickSelectContainer}>
              {[1, 2, 3, 4, 5, 10].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[styles.quickSelectButton, peopleCount === num && styles.quickSelectButtonActive]}
                  onPress={() => setPeopleCount(num)}
                >
                  <Text style={[styles.quickSelectText, peopleCount === num && styles.quickSelectTextActive]}>
                    {num}명
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.peopleModalButtons}>
              <TouchableOpacity
                style={styles.peopleModalCancel}
                onPress={() => {
                  setShowPeopleModal(false);
                  setPendingTemplate(null);
                }}
              >
                <Text style={styles.peopleModalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.peopleModalConfirm}
                onPress={handlePeopleModalConfirm}
              >
                <Text style={styles.peopleModalConfirmText}>생성하기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Shared Checklist Modal */}
      <Modal
        visible={showImportModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowImportModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>공유받은 체크리스트 가져오기</Text>
            <TouchableOpacity
              onPress={() => {
                setShowImportModal(false);
                setImportText('');
                setImportValidation({ isValid: false, message: '' });
              }}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              친구나 가족이 공유한 체크리스트 링크나 텍스트를 아래에 붙여넣기 해주세요.
            </Text>

            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>사용 방법</Text>
              <Text style={styles.instructionText}>
                1. 친구가 공유한 메시지 전체를 복사{'\n'}
                2. 아래 입력란에 그대로 붙여넣기{'\n'}
                3. 자동으로 검증 후 가져오기 버튼이 활성화됩니다
              </Text>
            </View>

            <TextInput
              style={styles.importTextArea}
              placeholder="공유받은 메시지를 여기에 붙여넣기"
              value={importText}
              onChangeText={handleImportTextChange}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />

            {/* Validation Message */}
            {importValidation.message && (
              <View style={[
                styles.validationMessage,
                importValidation.isValid ? styles.validMessage : styles.errorMessage
              ]}>
                <Text style={[
                  styles.validationText,
                  importValidation.isValid ? styles.validText : styles.errorText
                ]}>
                  {importValidation.isValid ? '✅' : '❌'} {importValidation.message}
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setImportValidation({ isValid: false, message: '' });
                }}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.importModalButton,
                  (!importText.trim() || !importValidation.isValid) && styles.disabledButton
                ]}
                onPress={handleImportSharedChecklist}
                disabled={!importText.trim() || !importValidation.isValid}
              >
                <Text style={[
                  styles.importButtonText,
                  (!importText.trim() || !importValidation.isValid) && styles.disabledButtonText
                ]}>가져오기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#DC2626',
    padding: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  importButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationIcon: {
    fontSize: 24,
    color: 'white',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFC107',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  badges: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  searchResultContainer: {
    marginTop: 8,
  },
  searchResult: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  searchHint: {
    fontSize: 11,
    color: '#10B981',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  popularSection: {
    backgroundColor: 'white',
    paddingVertical: 16,
    marginHorizontal: -16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  popularScrollContainer: {
    paddingHorizontal: 8,
  },
  bottomPadding: {
    height: 20,
  },
  // People Count Modal
  peopleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  peopleModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  peopleModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  peopleModalDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  peopleCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  peopleCounterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peopleCounterButtonDisabled: {
    opacity: 0.4,
  },
  peopleCounterButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#374151',
  },
  peopleCounterButtonTextDisabled: {
    color: '#9CA3AF',
  },
  peopleCountDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginHorizontal: 24,
    minWidth: 80,
    justifyContent: 'center',
  },
  peopleCountNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#DC2626',
  },
  peopleCountUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 4,
  },
  quickSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  quickSelectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickSelectButtonActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  quickSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  quickSelectTextActive: {
    color: '#DC2626',
  },
  peopleModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  peopleModalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  peopleModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  peopleModalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  peopleModalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  // Import Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  instructionCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#0EA5E9',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#0369A1',
    lineHeight: 20,
  },
  importTextArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    backgroundColor: 'white',
    minHeight: 100,
    maxHeight: 150,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  importModalButton: {
    backgroundColor: '#DC2626',
  },
  importButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  disabledButtonText: {
    color: '#D1D5DB',
  },
  validationMessage: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  validMessage: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  errorMessage: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  validationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  validText: {
    color: '#047857',
  },
  errorText: {
    color: '#DC2626',
  },
});

export default HomeScreen;
