import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';

interface CelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  checklistTitle: string;
  completionRate: number;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  visible,
  onClose,
  checklistTitle,
  completionRate,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 축하 애니메이션
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const getCelebrationMessage = () => {
    if (completionRate === 100) {
      return {
        emoji: '🎉',
        title: '완벽해요!',
        message: '모든 준비가 끝났네요!\n이제 안심하고 떠나세요! ✨',
      };
    } else if (completionRate >= 80) {
      return {
        emoji: '👏',
        title: '거의 다 됐어요!',
        message: '조금만 더 힘내세요!\n완벽한 준비까지 얼마 안 남았어요!',
      };
    } else {
      return {
        emoji: '💪',
        title: '좋은 시작이에요!',
        message: '하나씩 체크하다 보면\n어느새 준비가 끝날 거예요!',
      };
    }
  };

  const celebration = getCelebrationMessage();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.emoji}>{celebration.emoji}</Text>
          <Text style={styles.title}>{celebration.title}</Text>
          <Text style={styles.subtitle}>{checklistTitle}</Text>
          <Text style={styles.message}>{celebration.message}</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${completionRate}%` }]} 
              />
            </View>
            <Text style={styles.progressText}>{completionRate}% 완료</Text>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>계속하기</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: width - 40,
    maxWidth: 320,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});