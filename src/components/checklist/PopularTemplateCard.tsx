import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SituationTemplate } from '../../types';
import { Button } from '../ui/Button';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.75; // 화면 너비의 75%

interface PopularTemplateCardProps {
  template: SituationTemplate;
  onUseTemplate: (templateId: string) => void;
  loading?: boolean;
}

export const PopularTemplateCard: React.FC<PopularTemplateCardProps> = ({
  template,
  onUseTemplate,
  loading = false
}) => {
  const getIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      '업무': '💼',
      '생활': '🏠',
      '여행': '✈️',
      '여가': '🎵',
      '운동': '💪',
      '공부': '📚',
      '일상': '🏠',
      '아웃도어': '🏕️',
    };
    return icons[category] || '📝';
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      '업무': '#3B82F6',
      '생활': '#10B981',
      '여행': '#F59E0B',
      '여가': '#8B5CF6',
      '운동': '#EF4444',
      '공부': '#6366F1',
      '일상': '#6B7280',
      '아웃도어': '#059669',
    };
    return colors[category] || '#DC2626';
  };

  return (
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(template.category) }]}>
          <Text style={styles.icon}>{getIcon(template.category)}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🔥 인기</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{template.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {template.description}
        </Text>
        
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{template.items.length}</Text>
            <Text style={styles.statLabel}>항목</Text>
          </View>
          {template.peopleMultiplier && (
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>👥</Text>
              <Text style={styles.statLabel}>인원별</Text>
            </View>
          )}
        </View>
        
        <Button
          title={loading ? '생성 중...' : '바로 사용하기'}
          onPress={() => onUseTemplate(template.id)}
          loading={loading}
          style={styles.useButton}
          size="small"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  badge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  useButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
  },
});