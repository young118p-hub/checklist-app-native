import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Checklist } from '../../types';

interface EnhancedShareModalProps {
  visible: boolean;
  onClose: () => void;
  checklist: Checklist;
}

const shareFormats = [
  {
    id: 'simple',
    title: '간단한 목록',
    description: '체크박스와 함께 깔끔한 텍스트',
    emoji: '📝',
  },
  {
    id: 'detailed',
    title: '상세 정보 포함',
    description: '진행률과 설명까지 모든 정보',
    emoji: '📊',
  },
  {
    id: 'markdown',
    title: '마크다운 형식',
    description: '깃헙이나 노션에서 사용 가능',
    emoji: '💻',
  },
  {
    id: 'korean_style',
    title: '한국어 스타일',
    description: '이모티콘과 한국어 표현',
    emoji: '🇰🇷',
  },
];

export const EnhancedShareModal: React.FC<EnhancedShareModalProps> = ({
  visible,
  onClose,
  checklist,
}) => {
  const [selectedFormat, setSelectedFormat] = useState('detailed');

  const generateShareText = (format: string): string => {
    const completedItems = checklist.items.filter(item => item.isCompleted);
    const totalItems = checklist.items.length;
    const progress = Math.round((completedItems.length / totalItems) * 100);

    switch (format) {
      case 'simple':
        return `${checklist.title}\n\n${checklist.items.map((item, index) => 
          `${item.isCompleted ? '✅' : '☐'} ${item.title}`
        ).join('\n')}\n\n아맞다이거! 앱에서 생성됨`;

      case 'markdown':
        return `# ${checklist.title}\n\n${checklist.description ? `> ${checklist.description}\n\n` : ''}**진행률:** ${completedItems.length}/${totalItems} (${progress}%)\n\n## 체크리스트\n\n${checklist.items.map((item, index) => 
          `- [${item.isCompleted ? 'x' : ' '}] ${item.title}${item.description ? ` - ${item.description}` : ''}`
        ).join('\n')}\n\n---\n*아맞다이거! 앱에서 생성됨*`;

      case 'korean_style':
        return `🎯 ${checklist.title}\n\n${progress === 100 ? '🎉 완료!' : progress >= 80 ? '👍 거의 다!' : progress >= 50 ? '💪 절반 완료!' : '🚀 시작!'} 진행률: ${progress}%\n\n${checklist.items.map((item, index) => {
          const emoji = item.isCompleted ? '✅' : '🔲';
          const orderEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index] || `${index + 1}️⃣`;
          return `${orderEmoji} ${emoji} ${item.title}${item.quantity && item.quantity > 1 ? ` (${item.quantity}${item.unit || '개'})` : ''}`;
        }).join('\n')}\n\n💡 아맞다이거! 앱으로 더 많은 템플릿을 확인해보세요!`;

      case 'detailed':
      default:
        return `📝 ${checklist.title}\n\n✅ 진행률: ${completedItems.length}/${totalItems} (${progress}%)\n\n${checklist.description ? `📄 ${checklist.description}\n\n` : ''}📋 체크리스트:\n${checklist.items.map((item, index) => 
          `${index + 1}. ${item.isCompleted ? '✅' : '☐'} ${item.title}${
            item.quantity && item.quantity > 1 ? ` (${item.quantity}${item.unit || ''})` : ''
          }${item.description ? `\n   💬 ${item.description}` : ''}`
        ).join('\n')}\n\n🚀 아맞다이거! 앱에서 생성됨`;
    }
  };

  const handleShare = async (format: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const shareText = generateShareText(format);
      await Share.share({
        message: shareText,
        title: checklist.title,
      });
      onClose();
    } catch (error) {
      Alert.alert('오류', '공유에 실패했습니다.');
    }
  };

  const handleFormatSelect = (formatId: string) => {
    Haptics.selectionAsync();
    setSelectedFormat(formatId);
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
              onPress={() => handleFormatSelect(format.id)}
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
                {generateShareText(selectedFormat)}
              </Text>
            </ScrollView>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => handleShare(selectedFormat)}
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
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  shareButton: {
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