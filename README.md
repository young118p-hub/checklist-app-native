# 아맞다이거! - React Native 버전

한국 상황에 최적화된 체크리스트 앱의 React Native/Expo 버전입니다. 로그인 없이 바로 사용할 수 있으며, 다양한 상황별 템플릿을 제공합니다.

## 🚀 주요 기능

### ✨ 핵심 기능
- **로그인 불필요**: 즉시 사용 가능한 오프라인 체크리스트
- **한국 상황 특화**: 출장, 병원, 여행, 회사 등 한국인의 실제 상황을 반영한 템플릿
- **스마트 검색**: 동의어, 초성 검색 지원 (예: "ㅊㅈ" → "출장")
- **인원별 자동 계산**: 템플릿에 따라 필요 수량 자동 조정
- **꿀팁 포함**: 실제 경험에서 나온 유용한 팁들 제공

### 📱 React Native 최적화 기능
- **햅틱 피드백**: 체크박스 클릭, 버튼 터치 시 진동 피드백
- **벡터 아이콘**: @expo/vector-icons를 활용한 깔끔한 UI
- **FlatList 최적화**: 대용량 리스트의 부드러운 스크롤링
- **Pull-to-Refresh**: 당겨서 새로고침 지원
- **React.memo**: 컴포넌트 리렌더링 최적화
- **useCallback/useMemo**: 성능 최적화된 콜백 함수

### 🧠 스마트 기능
- **스마트 추천**: AI 기반 빠뜨릴 수 있는 항목 추천
- **완료율 분석**: 자주 놓치는 항목 분석 및 알림
- **축하 모달**: 체크리스트 완료 시 성취감 제공
- **알림 센터**: 맞춤형 스마트 알림 시스템

## 🛠 기술 스택

- **React Native** (0.79.6)
- **Expo** (SDK 53)
- **TypeScript** (5.8.3)
- **Zustand** (5.0.8) - 상태 관리
- **React Navigation** (7.x) - 네비게이션
- **AsyncStorage** (2.2.0) - 로컬 저장소
- **Expo Haptics** (14.1.4) - 햅틱 피드백
- **Expo Vector Icons** - UI 아이콘

## 📁 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── checklist/      # 체크리스트 관련 컴포넌트
│   └── ui/             # UI 기본 컴포넌트
├── constants/          # 상수 및 템플릿 데이터
├── navigation/         # 네비게이션 설정
├── screens/           # 화면 컴포넌트
│   ├── home/          # 홈 화면
│   ├── my/            # 내 체크리스트 화면
│   ├── create/        # 새 체크리스트 생성
│   └── checklist/     # 체크리스트 상세
├── stores/            # Zustand 상태 관리
├── types/             # TypeScript 타입 정의
└── utils/             # 유틸리티 함수
```

## 📦 설치 및 실행

### 1. 프로젝트 설치
```bash
# 의존성 설치
npm install

# Expo CLI 설치 (글로벌)
npm install -g @expo/cli
```

### 2. 개발 서버 실행
```bash
# 일반 시작
npm start

# 또는 Expo 직접 실행
expo start

# 웹으로 실행 (테스트용)
npm run web
```

### 3. 앱 실행
- **iOS**: Expo Go 앱에서 QR 코드 스캔
- **Android**: Expo Go 앱에서 QR 코드 스캔
- **웹**: 자동으로 브라우저에서 열림

## 📱 주요 화면

### 1. 홈 화면 (HomeScreen)
- 템플릿 목록 표시
- 검색 기능
- 원클릭 체크리스트 생성

### 2. 내 체크리스트 (MyChecklistsScreen)
- 생성된 체크리스트 목록
- 진행률 표시
- 삭제 기능

### 3. 체크리스트 상세 (ChecklistDetailScreen)
- 항목별 체크 기능
- 진행률 추적
- 공유 기능

### 4. 생성 화면 (CreateChecklistScreen)
- 새 체크리스트 생성
- 동적 항목 추가/삭제
- 인원수별 수량 설정

## 🔧 컴포넌트 구조

### UI 컴포넌트
- **Button**: 다양한 스타일의 버튼 컴포넌트
- **Card**: 카드 레이아웃 컴포넌트
- **Input**: 입력 필드 컴포넌트

### 체크리스트 컴포넌트
- **ChecklistCard**: 체크리스트 미리보기 카드
- **TemplateCard**: 템플릿 카드
- **ChecklistItem**: 개별 체크리스트 항목

## 💾 데이터 구조

### 체크리스트 (Checklist)
```typescript
interface Checklist {
  id: string;
  title: string;
  description?: string;
  peopleCount?: number;
  items: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 체크리스트 항목 (ChecklistItem)
```typescript
interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  isCompleted: boolean;
  order: number;
}
```

## 🔄 상태 관리

Zustand를 사용한 전역 상태 관리:
- **checklistStore**: 체크리스트 CRUD 및 상태 관리
- **AsyncStorage**: 브라우저 새로고침 시에도 데이터 유지

## 🚀 빌드 및 배포

### 개발 빌드
```bash
expo build:web      # 웹 빌드
expo build:android  # Android APK
expo build:ios      # iOS IPA (Mac 필요)
```

### 프로덕션 배포
```bash
# EAS Build 사용 (권장)
npm install -g eas-cli
eas build --platform all

# 또는 Expo 클래식 빌드
expo build:android --type apk
expo build:ios --type archive
```

## 📋 템플릿 종류

현재 포함된 템플릿:
- **일상**: 출근 준비, 헬스장 준비, 잠자기 전
- **아웃도어**: 캠핑, 등산
- **여행**: 국내 여행, 펜션

더 많은 템플릿을 추가하려면 `src/constants/templates.ts` 파일을 수정하세요.

## 🤝 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 📄 라이센스

MIT License