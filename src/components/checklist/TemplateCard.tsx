import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SituationTemplate } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

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
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(template.category) }]}>
          <Text style={styles.icon}>{getIcon(template.category)}</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{template.name}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {template.description}
          </Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{template.items.length}</Text>
        </View>
      </View>
      
      <View style={styles.itemsPreview}>
        <Text style={styles.itemsText}>
          {template.items.slice(0, 3).map(item => item.title).join(', ')}
          {template.items.length > 3 && ` 외 ${template.items.length - 3}개`}
        </Text>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.footerBadges}>
          <View style={styles.category}>
            <Text style={styles.categoryText}>{template.category}</Text>
          </View>
          {template.peopleMultiplier && (
            <View style={styles.peopleBadge}>
              <Text style={styles.peopleBadgeText}>👥 인원별</Text>
            </View>
          )}
        </View>
        <Button
          title={loading ? '생성 중...' : '바로 사용하기'}
          onPress={() => onUseTemplate(template.id)}
          size="small"
          loading={loading}
          style={styles.useButton}
        />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  itemsPreview: {
    marginBottom: 16,
  },
  itemsText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  category: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  peopleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  peopleBadgeText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  useButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});