import { SituationTemplate } from '../types';

// 동의어 및 연관 키워드 매핑
export const SEARCH_KEYWORDS = {
  // 출장 관련
  '출장': ['비즈니스', '업무여행', '회사일', '미팅', '회의', '사업', '비지니스'],
  '회사': ['업무', '직장', '오피스', '사무실', '직업'],
  
  // 병원 관련
  '병원': ['의료', '치료', '수술', '입원', '진료', '응급실', '헬스케어'],
  '입원': ['병원', '치료', '수술', '회복', '의료'],
  '아픈': ['병원', '치료', '의료', '아프다', '몸살'],
  
  // 신생아 관련
  '아기': ['신생아', '베이비', '유아', '아이', '영아', '갓난아기'],
  '출산': ['아기', '신생아', '임신', '분만', '육아'],
  '육아': ['아기', '신생아', '양육', '아이키우기'],
  
  // 여행 관련
  '여행': ['휴가', '관광', '트립', '휴양', '놀러가기'],
  '휴가': ['여행', '휴양', '쉬기', '놀러가기', '관광'],
  '바다': ['해수욕장', '여름휴가', '수영', '바닷가'],
  '산': ['등산', '하이킹', '트레킹', '산행'],
  
  // 운동 관련
  '운동': ['헬스', '피트니스', '체육', '스포츠', '워크아웃'],
  '헬스': ['운동', '피트니스', '웨이트', '근력운동', '체육관'],
  '다이어트': ['운동', '헬스', '살빼기', '체중감량'],
  
  // 공부 관련
  '공부': ['학습', '시험', '교육', '연구', '학업'],
  '시험': ['공부', '학습', '시험공부', '수험', '테스트'],
  '학교': ['공부', '학습', '교육', '수업'],
  
  // 일상 관련
  '출근': ['회사', '직장', '업무', '아침', '출퇴근'],
  '퇴근': ['집', '하루끝', '업무종료'],
  '아침': ['출근', '모닝', '새벽', '기상'],
  
  // 생활 관련
  '이사': ['이주', '이전', '집이사', '거주지변경', '새집'],
  '청소': ['정리', '정돈', '깨끗하게', '대청소'],
  
  // 여가 관련
  '콘서트': ['공연', '음악회', '라이브', '뮤직', '페스티벌'],
  '페스티벌': ['축제', '콘서트', '공연', '이벤트'],
  '놀이': ['재미', '오락', '게임', '엔터테인먼트'],
  
  // 계절/날씨 관련
  '겨울': ['스키', '보드', '눈', '추위', '방한'],
  '여름': ['바다', '수영', '더위', '휴가'],
  '비': ['우산', '우비', '장마'],
  
  // 특별한 날
  '결혼': ['신혼여행', '웨딩', '혼인', '결혼식'],
  '신혼여행': ['허니문', '결혼', '여행', '신혼'],
};

// 한글 자음 분리 (초성 검색용)
export const getInitialConsonants = (text: string): string => {
  const INITIALS = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
  ];
  
  return text.split('').map(char => {
    const code = char.charCodeAt(0) - 44032;
    if (code >= 0 && code <= 11171) {
      const initialIndex = Math.floor(code / 588);
      return INITIALS[initialIndex];
    }
    return char;
  }).join('');
};

// 스마트 검색 점수 계산
export const calculateSearchScore = (template: SituationTemplate, searchTerm: string): number => {
  const searchLower = searchTerm.toLowerCase();
  const searchInitials = getInitialConsonants(searchTerm);
  let score = 0;
  
  // 1. 완전 일치 (최고 점수)
  if (template.name.toLowerCase().includes(searchLower)) {
    score += 100;
  }
  
  if (template.description.toLowerCase().includes(searchLower)) {
    score += 80;
  }
  
  if (template.category.toLowerCase().includes(searchLower)) {
    score += 60;
  }
  
  // 2. 초성 검색
  const nameInitials = getInitialConsonants(template.name);
  const descInitials = getInitialConsonants(template.description);
  
  if (nameInitials.includes(searchInitials)) {
    score += 40;
  }
  
  if (descInitials.includes(searchInitials)) {
    score += 30;
  }
  
  // 3. 동의어 및 연관 키워드 검색
  Object.entries(SEARCH_KEYWORDS).forEach(([keyword, synonyms]) => {
    if (searchLower.includes(keyword.toLowerCase())) {
      // 검색어가 키워드를 포함하는 경우
      if (template.name.toLowerCase().includes(keyword.toLowerCase()) ||
          template.description.toLowerCase().includes(keyword.toLowerCase())) {
        score += 70;
      }
      
      // 동의어들과 매칭
      synonyms.forEach(synonym => {
        if (template.name.toLowerCase().includes(synonym.toLowerCase()) ||
            template.description.toLowerCase().includes(synonym.toLowerCase())) {
          score += 50;
        }
      });
    }
    
    // 반대로 템플릿이 키워드를 포함하고 검색어가 동의어인 경우
    if (template.name.toLowerCase().includes(keyword.toLowerCase()) ||
        template.description.toLowerCase().includes(keyword.toLowerCase())) {
      synonyms.forEach(synonym => {
        if (searchLower.includes(synonym.toLowerCase())) {
          score += 50;
        }
      });
    }
  });
  
  // 4. 항목 내용 검색
  template.items.forEach(item => {
    if (item.title.toLowerCase().includes(searchLower)) {
      score += 30;
    }
    if (item.description?.toLowerCase().includes(searchLower)) {
      score += 20;
    }
  });
  
  // 5. 부분 문자열 매칭 (유사도)
  const similarity = calculateStringSimilarity(searchLower, template.name.toLowerCase());
  if (similarity > 0.3) {
    score += similarity * 40;
  }
  
  return score;
};

// 문자열 유사도 계산 (Levenshtein distance 기반)
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

// Levenshtein Distance 계산
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// 스마트 검색 함수
export const smartSearch = (templates: SituationTemplate[], searchTerm: string): SituationTemplate[] => {
  if (!searchTerm.trim()) {
    return templates;
  }
  
  const scoredTemplates = templates.map(template => ({
    template,
    score: calculateSearchScore(template, searchTerm)
  }));
  
  // 점수가 10 이상인 템플릿만 반환 (관련성이 있다고 판단)
  return scoredTemplates
    .filter(item => item.score >= 10)
    .sort((a, b) => b.score - a.score)
    .map(item => item.template);
};