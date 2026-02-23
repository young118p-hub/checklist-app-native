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

interface Recommendation {
  title: string;
  description: string;
  reason: string;
  icon: string;
}

// 키워드 매칭 기반 추천 데이터
const KEYWORD_RECOMMENDATIONS: Array<{
  keywords: string[];
  items: Recommendation[];
}> = [
  // 고기/바베큐 관련
  {
    keywords: ['고기', '삼겹살', '소고기', '돼지', '바베큐', 'bbq', '그릴'],
    items: [
      { title: '키친타올', description: '고기 핏물 제거용', reason: '고기 맛이 달라져요', icon: '🧻' },
      { title: '알루미늄 호일', description: '불판 깔기, 감싸 굽기', reason: '뒷정리가 편해요', icon: '🫕' },
      { title: '소금/후추', description: '간 맞추기용', reason: '양념 부족할 때', icon: '🧂' },
      { title: '늘어나는 바지', description: '배 나올 거 대비', reason: '고기 앞에서 다이어트란 없다', icon: '👖' },
    ],
  },
  // 캠핑 관련
  {
    keywords: ['텐트', '캠핑', '타프', '랜턴', '침낭', '매트'],
    items: [
      { title: '망치/펙', description: '텐트 고정용', reason: '바람 불면 필수', icon: '🔨' },
      { title: '여분 건전지', description: '랜턴/손전등용', reason: '밤에 전지 나가면 난감', icon: '🔦' },
      { title: '방수 시트', description: '텐트 바닥 보호용', reason: '습기 차단 필수', icon: '💧' },
      { title: '집 가고 싶은 마음 봉인', description: '새벽 3시에 흔들림', reason: '텐트 안은 내 침대가 아니다', icon: '🏠' },
    ],
  },
  // 출장/업무 관련
  {
    keywords: ['노트북', '명함', '프레젠테이션', '미팅', '회의', '출장'],
    items: [
      { title: '충전 어댑터', description: 'USB-C 멀티포트', reason: '콘센트 부족할 때', icon: '🔌' },
      { title: '노트/펜', description: '메모용', reason: '갑자기 메모할 때', icon: '📝' },
      { title: 'HDMI 케이블', description: '발표 연결용', reason: '어댑터 없는 회의실 대비', icon: '🖥️' },
      { title: '퇴사 참기 힘', description: '출장 중 갑자기 현타 올 때', reason: '참아... 아직은 때가 아니야', icon: '😮‍💨' },
    ],
  },
  // 여행/비행기 관련
  {
    keywords: ['여권', '비행기', '공항', '탑승', '항공', '캐리어', '해외'],
    items: [
      { title: '목베개', description: '장시간 비행용', reason: '목 아프면 여행 시작부터 힘들어요', icon: '💤' },
      { title: '멀티 어댑터', description: '해외 콘센트 규격 대응', reason: '나라마다 플러그가 달라요', icon: '🔌' },
      { title: '지퍼백', description: '액체류 기내 반입용', reason: '공항 보안 통과 필수', icon: '🛍️' },
      { title: '현지 사과 멘트', description: '"쏘리"만 알면 절반은 해결', reason: '일단 웃으면서 사과하기', icon: '🙏' },
    ],
  },
  // 운동 관련
  {
    keywords: ['운동화', '운동복', '헬스', '러닝', '요가', '수영', '스트레칭'],
    items: [
      { title: '근육 밴드', description: '워밍업/스트레칭용', reason: '부상 예방 필수', icon: '🏋️' },
      { title: '단백질 보충제', description: '운동 후 섭취', reason: '근회복에 도움', icon: '🥤' },
      { title: '이어폰', description: '운동 중 음악 감상', reason: '동기부여 UP', icon: '🎧' },
      { title: '의지력', description: '헬스장 앞에서 돌아갈 뻔', reason: '오늘도 출석이 반이다', icon: '💪' },
    ],
  },
  // 병원 관련
  {
    keywords: ['진료', '검사', '입원', '수술', '병원', '건강검진'],
    items: [
      { title: '이전 처방전', description: '복용 중인 약 목록', reason: '의사에게 보여주기', icon: '📋' },
      { title: '편한 옷', description: '탈의하기 쉬운 옷', reason: '검사/진료 시 편리', icon: '👕' },
      { title: '보호자 연락처', description: '비상 연락용 메모', reason: '만약의 상황 대비', icon: '📞' },
      { title: '담담한 척 연기력', description: '주사 맞을 때 안 무서운 척', reason: '어른이니까 울면 안 돼', icon: '🎭' },
    ],
  },
  // 이사 관련
  {
    keywords: ['이사', '박스', '포장', '짐'],
    items: [
      { title: '라벨/마커', description: '박스 내용물 표시', reason: '풀 때 시간 절약', icon: '🏷️' },
      { title: '청소도구', description: '이사 전/후 청소', reason: '깨끗하게 나가고 들어가기', icon: '🧹' },
      { title: '에어캡', description: '깨지기 쉬운 물건 보호', reason: '그릇/전자기기 파손 방지', icon: '📦' },
      { title: '이사 후 치킨', description: '새집에선 치킨이 국룰', reason: '이사 끝 = 치킨 시작', icon: '🍗' },
    ],
  },
  // 면접 관련
  {
    keywords: ['면접', '자기소개', '이력서', '포트폴리오'],
    items: [
      { title: '여분 이력서', description: '2부 이상 출력', reason: '면접관이 여러 명일 수 있어요', icon: '📄' },
      { title: '구두약/옷솔', description: '깔끔한 외모 유지', reason: '첫인상이 중요해요', icon: '👞' },
      { title: '물/사탕', description: '목 축이기', reason: '긴장하면 목이 말라요', icon: '💧' },
      { title: '포커페이스', description: '연봉 물어볼 때 표정관리', reason: '속으로만 계산기 두드리기', icon: '😐' },
    ],
  },
  // 결혼/웨딩 관련
  {
    keywords: ['결혼', '웨딩', '축의금', '하객', '신혼'],
    items: [
      { title: '여분 스타킹', description: '올 나감 대비', reason: '식장에서 당황 방지', icon: '🧦' },
      { title: '손수건', description: '감동의 눈물용', reason: '울컥할 때 필요해요', icon: '🤧' },
      { title: '편한 신발', description: '2차용 갈아신을 신발', reason: '구두 오래 신으면 아파요', icon: '👟' },
      { title: '뷔페 빈 접시 전략', description: '동선 파악이 핵심', reason: '축의금값은 뽑아야지', icon: '🍽️' },
    ],
  },
  // 데이트 관련
  {
    keywords: ['데이트', '영화', '놀이공원', '벚꽃', '카페'],
    items: [
      { title: '휴대용 거울', description: '외모 체크용', reason: '화장 무너짐 방지', icon: '🪞' },
      { title: '립밤', description: '입술 건조 방지', reason: '사소하지만 중요해요', icon: '💋' },
      { title: '휴대용 향수', description: '은은한 향기', reason: '좋은 인상 남기기', icon: '✨' },
      { title: '카드 잔액 확인', description: '계산할 때 잔액 부족은 실화?', reason: '로맨스 파괴자 1위', icon: '💳' },
    ],
  },
  // 세차 관련
  {
    keywords: ['세차', '왁스', '광택', '차량'],
    items: [
      { title: '유리세정제', description: '앞유리/사이드미러', reason: '시야 확보 중요', icon: '🪟' },
      { title: '타이어 광택제', description: '타이어 코팅', reason: '마무리 퀄리티 UP', icon: '🛞' },
      { title: '실내 방향제', description: '새차 느낌 연출', reason: '세차 마무리 필수', icon: '🌸' },
      { title: '비 안 오게 해주세요', description: '세차하면 비 온다는 전설', reason: '세차 = 기우제 아닙니다', icon: '🌧️' },
    ],
  },
  // 수영/워터파크 관련
  {
    keywords: ['수영', '워터파크', '물놀이', '수영복', '래쉬가드'],
    items: [
      { title: '방수팩', description: '핸드폰 보호', reason: '물속 사진도 찍을 수 있어요', icon: '📱' },
      { title: '귀마개', description: '물 들어감 방지', reason: '중이염 예방', icon: '👂' },
      { title: '아쿠아슈즈', description: '발 보호용', reason: '바닥 미끄러움 방지', icon: '🩴' },
      { title: '복근 만들 시간', description: '래쉬가드 안에서도 티남', reason: '...내년을 기약합시다', icon: '🏖️' },
    ],
  },
  // 명절 관련
  {
    keywords: ['설날', '추석', '차례', '명절', '제사'],
    items: [
      { title: '세뱃돈 봉투', description: '새 지폐 준비', reason: '미리 환전 필요', icon: '💰' },
      { title: '앞치마', description: '음식 준비 시', reason: '옷에 기름 튀는 거 방지', icon: '👨‍🍳' },
      { title: '비닐장갑', description: '음식 다룰 때', reason: '위생적인 조리', icon: '🧤' },
      { title: '잔소리 방어막', description: '결혼은 언제/취업은 했니 대비', reason: '명절 보스전 필수 아이템', icon: '🛡️' },
    ],
  },
  // 글램핑 관련
  {
    keywords: ['글램핑'],
    items: [
      { title: '블루투스 스피커', description: '분위기 음악', reason: '캠핑 분위기 UP', icon: '🔊' },
      { title: '와인오프너', description: '와인/음료 오픈용', reason: '없으면 못 따요', icon: '🍷' },
      { title: '담요', description: '밤에 쌀쌀할 때', reason: '야외 저녁은 추워요', icon: '🛏️' },
      { title: '인스타 감성', description: '조명 각도 잡기 연습', reason: '글램핑 왔으면 인생샷은 국룰', icon: '📸' },
    ],
  },
  // 공부/카페 관련
  {
    keywords: ['공부', '카페', '노트', '시험', '스터디'],
    items: [
      { title: '타이머', description: '뽀모도로 공부법', reason: '집중력 향상', icon: '⏱️' },
      { title: '귀마개/이어폰', description: '소음 차단', reason: '집중 환경 조성', icon: '🎧' },
      { title: '간식', description: '당분 보충', reason: '뇌는 포도당이 필요해요', icon: '🍫' },
      { title: '폰 멀리 두기', description: '"잠깐만 볼게"는 거짓말', reason: '릴스 보다가 2시간 증발', icon: '📵' },
    ],
  },
];

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  currentItems,
  templateCategory,
  onAddRecommendation,
}) => {
  const getSmartRecommendations = () => {
    const currentTitles = currentItems.map(item => item.title.toLowerCase().trim());
    const currentTitlesJoined = currentTitles.join(' ');

    const matched: Recommendation[] = [];

    // 키워드 매칭 기반 추천
    for (const group of KEYWORD_RECOMMENDATIONS) {
      const isMatch = group.keywords.some(keyword =>
        currentTitlesJoined.includes(keyword)
      );
      if (isMatch) {
        for (const item of group.items) {
          if (!currentTitles.some(t => t.includes(item.title.toLowerCase()))) {
            matched.push(item);
          }
        }
      }
    }

    // 매칭된 게 3개 이상이면 바로 반환
    if (matched.length >= 3) {
      return matched.slice(0, 3);
    }

    // 계절 기반 보충 추천 (매칭된 게 부족할 때만)
    const month = new Date().getMonth() + 1;

    if (month >= 6 && month <= 8) {
      if (!currentTitles.some(t => t.includes('선크림'))) {
        matched.push({ title: '선크림', description: 'SPF50+ 자외선 차단제', reason: '여름철 필수템', icon: '☀️' });
      }
    }
    if ((month >= 12 || month <= 2)) {
      if (!currentTitles.some(t => t.includes('핫팩'))) {
        matched.push({ title: '핫팩', description: '손발 보온용', reason: '추운 겨울 대비', icon: '🔥' });
      }
    }
    if (month >= 6 && month <= 9) {
      if (!currentTitles.some(t => t.includes('우산') && t.includes('접이식'))) {
        matched.push({ title: '접이식 우산', description: '갑작스런 비 대비', reason: '장마철 필수', icon: '☔' });
      }
    }

    return matched.slice(0, 3);
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
