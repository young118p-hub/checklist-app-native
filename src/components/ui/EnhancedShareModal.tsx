import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Checklist } from '../../types';
import {
  shareChecklist,
  generateAppShareText,
  generateTextShareText,
} from '../../utils/shareUtils';

interface EnhancedShareModalProps {
  visible: boolean;
  onClose: () => void;
  checklist: Checklist;
}

const shareFormats = [
  {
    id: 'app' as const,
    title: '앱으로 보내기',
    description: '받는 사람이 앱에서 바로 가져올 수 있어요',
    emoji: '📲',
  },
  {
    id: 'text' as const,
    title: '텍스트만 보내기',
    description: '깔끔한 체크리스트 목록을 공유해요',
    emoji: '📝',
  },
];

export const EnhancedShareModal: React.FC<EnhancedShareModalProps> = ({
  visible,
  onClose,
  checklist,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'app' | 'text'>('app');

  const getShareText = (format: 'app' | 'text'): string => {
    return format === 'app'
      ? generateAppShareText(checklist)
      : generateTextShareText(checklist);
  };

  const handleShare = async () => {
    try {
      const success = await shareChecklist(checklist, selectedFormat);
      if (success) {
        onClose();
      }
    } catch (error) {
      Alert.alert('오류', '공유에 실패했습니다.');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const shareText = getShareText(selectedFormat);
      await Clipboard.setStringAsync(shareText);
      Alert.alert('복사 완료! 📋', '클립보드에 복사되었습니다.\n메신저에 붙여넣기 해주세요.');
    } catch (error) {
      Alert.alert('오류', '클립보드 복사에 실패했습니다.');
    }
  };

  const selectedFormatData = shareFormats.find(f => f.id === selectedFormat);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>공유하기</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>공유 형식 선택</Text>

          {shareFormats.map((format) => (
            <TouchableOpacity
              key={format.id}
              style={[
                styles.formatCard,
                selectedFormat === format.id && styles.formatCardSelected,
              ]}
              onPress={() => setSelectedFormat(format.id)}
            >
              <View style={styles.formatInfo}>
                <Text style={styles.formatEmoji}>{format.emoji}</Text>
                <View style={styles.formatText}>
                  <Text style={styles.formatTitle}>{format.title}</Text>
                  <Text style={styles.formatDescription}>{format.description}</Text>
                </View>
              </View>
              <View style={[
                styles.radioButton,
                selectedFormat === format.id && styles.radioButtonSelected,
              ]}>
                {selectedFormat === format.id && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}

          <Text style={styles.previewTitle}>미리보기</Text>
          <View style={styles.previewContainer}>
            <ScrollView style={styles.previewScroll}>
              <Text style={styles.previewText}>
                {getShareText(selectedFormat)}
              </Text>
            </ScrollView>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyToClipboard}
          >
            <Text style={styles.copyButtonText}>
              📋 복사하기
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Text style={styles.shareButtonText}>
              {selectedFormatData?.emoji} 공유하기
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 18,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  formatCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formatCardSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  formatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  formatEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  formatText: {
    flex: 1,
  },
  formatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  formatDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#DC2626',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DC2626',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
  },
  previewContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewScroll: {
    maxHeight: 168,
  },
  previewText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  copyButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  copyButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
