import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';

interface EditableTitleProps {
  title: string;
  onSave: (newTitle: string) => void;
  style?: any;
  maxLength?: number;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({
  title,
  onSave,
  style,
  maxLength = 50
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);

  const handleSave = () => {
    const trimmedTitle = editTitle.trim();
    
    if (!trimmedTitle) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }
    
    if (trimmedTitle === title) {
      setIsEditing(false);
      return;
    }
    
    onSave(trimmedTitle);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <View style={[styles.container, style]}>
        <TextInput
          style={styles.input}
          value={editTitle}
          onChangeText={setEditTitle}
          onSubmitEditing={handleSave}
          onBlur={handleSave}
          autoFocus
          maxLength={maxLength}
          placeholder="체크리스트 제목을 입력하세요"
        />
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      onPress={() => setIsEditing(true)}
      style={[styles.titleContainer, style]}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.editIcon}>✏️</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  editIcon: {
    fontSize: 16,
    marginLeft: 8,
    opacity: 0.6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    backgroundColor: 'white',
    color: '#111827',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});