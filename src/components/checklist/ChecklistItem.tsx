import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';

import { ChecklistItem as ChecklistItemType } from '../../types';

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: (itemId: string) => void;
  onPress?: () => void;
  onEdit?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
  showDeleteButton?: boolean;
}

export const ChecklistItemComponent: React.FC<ChecklistItemProps> = React.memo(({
  item,
  onToggle,
  onPress,
  onEdit,
  onDelete,
  showDeleteButton = false
}) => {
  const [scaleValue] = useState(new Animated.Value(1));
  
  const handleToggle = () => {
    // 체크 애니메이션
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onToggle(item.id);
  };

  // 꿀팁인지 확인
  const isHoneyTip = item.description?.includes('🔥꿀팁');
  
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={() => onEdit?.(item.id)}
      delayLongPress={400}
      style={[styles.container, isHoneyTip && styles.honeyTipContainer]}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {isHoneyTip && (
          <View style={styles.honeyTipBadge}>
            <Text style={styles.honeyTipText}>꿀팁</Text>
          </View>
        )}
        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <TouchableOpacity
            style={[styles.checkbox, item.isCompleted && styles.checkboxCompleted]}
            onPress={handleToggle}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {item.isCompleted && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
        
        <View style={styles.itemContent}>
          <View style={styles.titleRow}>
            <Text style={[
              styles.title,
              item.isCompleted && styles.completedText
            ]}>
              {item.title}
            </Text>
            <View style={styles.rightActions}>
              {item.quantity && (item.quantity > 1 || item.unit) && (
                <Text style={styles.quantity}>
                  {item.quantity}{item.unit}
                </Text>
              )}
              {showDeleteButton && onDelete && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => onDelete(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {item.description && (
            <Text style={[
              styles.description,
              item.isCompleted && styles.completedText
            ]}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  honeyTipContainer: {
    borderWidth: 2,
    borderColor: '#FFC107',
    backgroundColor: '#FFFBF0',
  },
  honeyTipBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: '#FFC107',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    zIndex: 1,
  },
  honeyTipText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  itemContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantity: {
    fontSize: 14,
    fontWeight: '500',
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 6,
  },
  deleteIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  completedText: {
    opacity: 0.6,
    textDecorationLine: 'line-through',
  },
});