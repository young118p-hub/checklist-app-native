import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ChecklistItem } from '../../types';

interface SmartRecommendationsProps {
  currentItems: ChecklistItem[];
  templateCategory?: string;
  onAddRecommendation: (title: string, description: string) => void;
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  currentItems,
  templateCategory,
  onAddRecommendation,
}) => {
  // 스마트 추천 로직
  const getSmartRecommendations = () => {
    const recommendations: Array<{
      title: string;
      description: string;
      reason: string;
      icon: string;
    }> = [];

    const currentTitles = currentItems.map(item => item.title.toLowerCase().trim());

    // 날씨/계절 기반 추천
    const now = new Date();
    const month = now.getMonth() + 1;

    if ((month >= 6 && month <= 8) && !currentTitles.some(title => title.includes('선크림'))) {
      recommendations.push({
        title: '선크림',
        description: 'SPF50+ 자외선 차단제',
        reason: '여름철 필수템',
        icon: '☀️',
      });
    }

    if ((month >= 12 || month <= 2) && !currentTitles.some(title => title.includes('핫팩'))) {
      recommendations.push({
        title: '핫팩',
        description: '손발 보온용',
        reason: '추운 겨울 대비',
        icon: '🔥',
      });
    }

    if ((month >= 6 && month <= 9) && !currentTitles.some(title => title.includes('우산'))) {
      recommendations.push({
        title: '우산',
        description: '장마철 필수품',
        reason: '비 오는 날 대비',
        icon: '☔',
      });
    }

    // 카테고리별 스마트 추천 (실제 템플릿 카테고리에 맞춤)
    if (templateCategory === '여행' || templateCategory === '아웃도어') {
      if (!currentTitles.some(title => title.includes('보조배터리'))) {
        recommendations.push({
          title: '보조배터리',
          description: '20000mAh 이상 추천',
          reason: '여행 중 배터리 방전 방지',
          icon: '🔋',
        });
      }
      if (!currentTitles.some(title => title.includes('상비약'))) {
        recommendations.push({
          title: '상비약',
          description: '감기약, 소화제, 파스',
          reason: '여행지에서 갑작스런 몸살',
          icon: '💊',
        });
      }
    }

    if (templateCategory === '여가') {
      if (!currentTitles.some(title => title.includes('물티슈'))) {
        recommendations.push({
          title: '물티슈',
          description: '손 청결 유지',
          reason: '음식 먹기 전/후',
          icon: '🧻',
        });
      }
      if (!currentTitles.some(title => title.includes('보조배터리'))) {
        recommendations.push({
          title: '보조배터리',
          description: '외출 시 필수',
          reason: '사진 많이 찍을 때',
          icon: '🔋',
        });
      }
    }

    if (templateCategory === '운동') {
      if (!currentTitles.some(title => title.includes('여분'))) {
        recommendations.push({
          title: '여분 옷',
          description: '운동 후 갈아입기',
          reason: '땀 흘린 후 쾌적함',
          icon: '👕',
        });
      }
    }

    if (templateCategory === '업무') {
      if (!currentTitles.some(title => title.includes('보조배터리'))) {
        recommendations.push({
          title: '보조배터리',
          description: '노트북/폰 충전용',
          reason: '외부 미팅 시 필수',
          icon: '🔋',
        });
      }
    }

    // 일반적인 추천
    if (!currentTitles.some(title => title.includes('손 소독제'))) {
      recommendations.push({
        title: '손 소독제',
        description: '개인 위생 관리',
        reason: '어디서든 위생 관리',
        icon: '🧴',
      });
    }

    return recommendations.slice(0, 3); // 최대 3개까지만
  };

  const recommendations = getSmartRecommendations();

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>이것도 필요할 수도...</Text>
        <Text style={styles.subtitle}>AI가 추천하는 추가 준비물</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {recommendations.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.recommendationCard}
            onPress={() => onAddRecommendation(item.title, item.description)}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
            <View style={styles.reasonBadge}>
              <Text style={styles.reasonText}>{item.reason}</Text>
            </View>
            <View style={styles.addButton}>
              <Text style={styles.addButtonText}>+ 추가</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollContainer: {
    paddingHorizontal: 4,
  },
  recommendationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 8,
  },
  reasonBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 9,
    color: '#4F46E5',
    textAlign: 'center',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
