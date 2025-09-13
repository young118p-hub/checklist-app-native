import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Platform,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SITUATION_TEMPLATES, POPULAR_TEMPLATES, calculateQuantity } from '../../constants/templates';
import { useChecklistStore } from '../../stores/checklistStore';
import { TemplateCard } from '../../components/checklist/TemplateCard';
import { PopularTemplateCard } from '../../components/checklist/PopularTemplateCard';
import { NotificationCenter } from '../../components/ui/NotificationCenter';
import { smartSearch } from '../../utils/smartSearch';
import { RootStackParamList } from '../../types';

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

  const handleUseTemplate = useCallback(async (templateId: string) => {
    const template = SITUATION_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    // Haptic feedback for template selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const checklistData = {
      title: template.name,
      description: template.description,
      isTemplate: false,
      isPublic: false,
      peopleCount: 1,
      categoryId: undefined,
      items: template.items.map((item, index) => ({
        title: item.title,
        description: item.description || '',
        quantity: calculateQuantity(item, template.peopleMultiplier ? 1 : 1),
        unit: item.unit || '',
        order: index
      }))
    };

    try {
      await createChecklist(checklistData);
      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '체크리스트 생성 완료!',
        `${template.name} 체크리스트가 생성되었습니다.`,
        [
          {
            text: '확인',
            onPress: () => navigation.navigate('MyChecklists' as any),
          },
        ]
      );
    } catch (error) {
      // Error haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('오류', '체크리스트 생성에 실패했습니다.');
    }
  }, [createChecklist, navigation]);

  const handleNotificationPress = (notification: any) => {
    if (notification.actionData) {
      switch (notification.actionData.type) {
        case 'open_checklist':
          navigation.navigate('ChecklistDetail', { id: notification.actionData.checklistId });
          break;
        case 'view_my_checklists':
          navigation.navigate('MyChecklists' as any);
          break;
        case 'browse_templates':
          setSearchTerm('');
          break;
      }
    }
    setShowNotificationCenter(false);
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
    ).filter(Boolean),
    []
  );

  const regularTemplates = useMemo(() => 
    filteredTemplates.filter(template => 
      !POPULAR_TEMPLATES.includes(template.id)
    ),
    [filteredTemplates]
  );

  // FlatList 렌더링 최적화
  const renderTemplateCard = useCallback(({ item }) => (
    <TemplateCard
      template={item}
      onUseTemplate={handleUseTemplate}
      loading={loading}
    />
  ), [handleUseTemplate, loading]);

  const renderPopularCard = useCallback(({ item }) => (
    <PopularTemplateCard
      template={item}
      onUseTemplate={handleUseTemplate}
      loading={loading}
    />
  ), [handleUseTemplate, loading]);

  const keyExtractor = useCallback((item) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>아맞다이거! 🤦‍♂️</Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowNotificationCenter(true);
            }}
          >
            <Ionicons 
              name="notifications" 
              size={24} 
              color="white" 
            />
            {getUnreadNotificationCount() > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {getUnreadNotificationCount()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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
                💡 동의어, 초성 검색 지원 (예: "ㅊㅈ" → 출장)
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Popular Templates Section */}
      {!searchTerm && (
        <View style={styles.popularSection}>
          <Text style={styles.sectionTitle}>🔥 인기 템플릿</Text>
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
      )}

      {/* All Templates List */}
      <View style={styles.scrollView}>
        {!searchTerm && (
          <Text style={styles.sectionTitle}>📂 모든 템플릿</Text>
        )}
        
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
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            removeClippedSubviews={true}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={10}
            updateCellsBatchingPeriod={100}
            getItemLayout={(data, index) => ({
              length: 180, // 예상되는 아이템 높이
              offset: 180 * index,
              index,
            })}
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
    paddingBottom: 20,
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
    paddingVertical: 20,
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
});

export default HomeScreen;