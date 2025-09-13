import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Checklist } from '../../types';
import { Card } from '../ui/Card';

interface ChecklistCardProps {
  checklist: Checklist;
  onPress: () => void;
  onEdit?: (id: string, newTitle: string) => void;
  showEditButton?: boolean;
}

export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  checklist,
  onPress,
  onEdit,
  showEditButton = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(checklist.title);
  
  const completedItems = checklist.items.filter(item => item.isCompleted).length;
  const totalItems = checklist.items.length;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const handleEditPress = (e: any) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleEditSave = () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }
    
    if (trimmedTitle !== checklist.title && onEdit) {
      onEdit(checklist.id, trimmedTitle);
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditTitle(checklist.title);
    setIsEditing(false);
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.header}>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                onSubmitEditing={handleEditSave}
                autoFocus
                maxLength={50}
              />
              <View style={styles.editButtons}>
                <TouchableOpacity onPress={handleEditCancel} style={styles.editCancelButton}>
                  <Text style={styles.editCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleEditSave} style={styles.editSaveButton}>
                  <Text style={styles.editSaveText}>저장</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{checklist.title}</Text>
                {showEditButton && (
                  <TouchableOpacity onPress={handleEditPress} style={styles.editButton}>
                    <Text style={styles.editIcon}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{totalItems}</Text>
              </View>
            </>
          )}
        </View>
        
        {checklist.description && (
          <Text style={styles.description} numberOfLines={2}>
            {checklist.description}
          </Text>
        )}
        
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, { width: `${progress}%` }]} 
            />
          </View>
          <Text style={styles.progressText}>
            {completedItems}/{totalItems} 완료
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.date}>
            {new Date(checklist.updatedAt).toLocaleDateString('ko-KR')}
          </Text>
          {checklist.peopleCount && checklist.peopleCount > 1 && (
            <Text style={styles.peopleCount}>
              {checklist.peopleCount}명 기준
            </Text>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  editIcon: {
    fontSize: 14,
    opacity: 0.6,
  },
  editContainer: {
    flex: 1,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: 'white',
    marginBottom: 8,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editCancelButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editCancelText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  editSaveButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editSaveText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  countBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  peopleCount: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
});