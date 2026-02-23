import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SituationTemplate } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_HORIZONTAL_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2 - CARD_GAP) / 2;

interface TemplateCardProps {
  template: SituationTemplate;
  onUseTemplate: (templateId: string) => void;
  loading?: boolean;
}

export const TemplateCard: React.FC<TemplateCardProps> = React.memo(({
  template,
  onUseTemplate,
  loading = false
}) => {
  const getIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      '일상': '🏠',
      '운동': '💪',
      '아웃도어': '🏕️',
      '여행': '✈️',
      '업무': '💼',
      '학습': '📚',
      '공부': '📚',
      '생활': '🏠',
      '여가': '🎵',
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
      '학습': '#6366F1',
      '일상': '#6B7280',
      '아웃도어': '#059669',
    };
    return colors[category] || '#DC2626';
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onUseTemplate(template.id)}
      activeOpacity={0.7}
      disabled={loading}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(template.category) }]}>
          <Text style={styles.icon}>{getIcon(template.category)}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{template.items.length}</Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={1}>{template.name}</Text>
      <Text style={styles.description} numberOfLines={1}>
        {template.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.category}>
          <Text style={styles.categoryText}>{template.category}</Text>
        </View>
        {template.peopleMultiplier && (
          <View style={styles.peopleBadge}>
            <Text style={styles.peopleBadgeText}>👥</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  description: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  category: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500',
  },
  peopleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  peopleBadgeText: {
    fontSize: 11,
  },
});
