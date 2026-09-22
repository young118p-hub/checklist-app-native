# 아맞다이거! - 체크리스트 앱

## Stack
- Expo SDK 57, React Native 0.86, React 19.2 (v2 리뉴얼 브랜치 `renewal/v2`에서 53 → 57 업그레이드)
- TypeScript 6, Zustand (상태관리)
- React Navigation 7 (bottom tabs + stack)
- Package: com.checklist.amajdaigeo
- Android 전용 (`platforms: ["android"]`)

## Build Config
- versionCode: 27 (마지막 스토어 빌드, 다음 출시 때 올릴 것)
- compileSdkVersion: 36, targetSdkVersion: 36 (Play 정책: 2026-08-31부터 업데이트는 API 36 이상 필수)
- 64-bit only (arm64-v8a, x86_64) - 16KB page size 대응
- Plugin: `plugins/withPageAlignment.js` - ABI 필터 + gradle.properties 설정
- CNG 방식: `android/`는 `expo prebuild`로 생성하고 커밋하지 않음 (.gitignore)
- 로컬 빌드 확인: `npx expo prebuild --platform android --clean` 후 `cd android && ./gradlew assembleDebug` (JDK 17)
- 에뮬레이터 실행: `npx expo run:android --no-bundler` + `npx expo start --dev-client` (**`CI=1`로 띄우지 말 것** — 파일 감시가 꺼져 수정이 반영 안 됨), `adb reverse tcp:8081 tcp:8081`

### app.json plugins
```json
"plugins": [
  "./plugins/withPageAlignment",
  ["expo-build-properties", { "android": { "compileSdkVersion": 36, "targetSdkVersion": 36 } }],
  ["expo-splash-screen", { "image": "./assets/splash-icon.png", "resizeMode": "contain", "imageWidth": 120, "backgroundColor": "#FFFFFF", "dark": { "backgroundColor": "#111214" } }],
  ["expo-font", { "fonts": ["./assets/fonts/Pretendard-*.otf (Regular/Medium/SemiBold/Bold)"] }],
  ["expo-notifications", { "color": "#F2553D" }]
]
// userInterfaceStyle: "automatic" (다크모드), 설정 탭에서 기기/밝게/어둡게 선택
```

## v2 디자인
- 시안 작업 파일: `design/v2/*.dc.html` + `canvas.json`
- 포인트 컬러 코랄 #F2553D 한 가지, 나머지 무채색. 이모지 대신 단색 라인 아이콘
- 앱 코드: 토큰 `src/theme/tokens.ts`(라이트/다크), 공통 부품 `src/components/ui/kit.tsx`, 아이콘 `src/components/ui/Icon.tsx`(시안 SVG 그대로)
- 색은 하드코딩하지 말고 `makeStyles(c => ...)` / `useColors()`로. 빨강(danger)은 삭제에만
- 폰트 Pretendard 4굵기 번들(`assets/fonts`, OFL). Android는 fontWeight가 안 먹어서 `fonts.bold` 같은 fontFamily로 굵기 지정
- 템플릿 문구의 이모지는 데이터는 두고 화면에서 `cleanText()`로 걷어냄

## Key Files
- `src/constants/templates.ts` - 템플릿 정의 + calculateQuantity() 수량 계산
- `src/utils/shareUtils.ts` - 공유 시스템 (#CHECKLIST_DATA# 마커 형식)
- `src/stores/checklistStore.ts` - Zustand 스토어
- `src/navigation/AppNavigator.tsx` - 네비게이션 (스와이프 탭 4개 홈/내 리스트/둘러보기/설정 + 스택 상세/만들기)
- `src/screens/create/CreateScreen.tsx` - 만들기 흐름 (상황 → [나라] → 날짜 → 인원/동행자), 엔진 호출
- `src/utils/reminders.ts` - 출발 전날 오후 8시 로컬 알림 (expo-notifications)
- `supabase/migrations/` - 백엔드 스키마·RLS (테스트: `npm run test:db`, PGlite). 연결 방법은 `supabase/README.md`
- `src/sync/` - 동기화: `client`(.env 없으면 꺼짐), `outbox`(못 보낸 변경), `merge`(서버→기기), `engine`(보내기·받기·실시간·초대)
- `src/stores/authStore.ts` - 카카오/구글/네이버(custom:naver) OAuth, 로그아웃, 계정 삭제
- `src/components/together.tsx` - 로그인 시트, 함께 챙기기 시트, 멤버·담당 시트
- `plugins/withPageAlignment.js` - 16KB 페이지 대응 플러그인

## 동기화 규칙
- 기기가 원본. 로그인했을 때만 변경을 outbox에 쌓아 서버로 보냄. 혼자 쓸 때(로그인 안 함)는 아무것도 쌓이지 않음
- 체크는 (항목 × 멤버) 한 행. 같이 챙길 것 = 가장 최근에 누른 사람, 각자 챙길 것 = 내 체크 (`deriveCompleted`)
- 못 보낸 변경이 있는 대상은 pull 때 기기 쪽을 유지 (`mergeSnapshot`의 pendingKeys)
- 시각 비교는 `Date.parse`로 (서버 `+00:00`, 기기 `Z` 형식이 섞임)
- Hermes에 WebCrypto가 없어서 `client.ts`에서 expo-crypto로 채움 (PKCE S256)
- 상세 화면은 `currentChecklist`가 아니라 route id로 리스트를 찾음 (화면이 여러 개 쌓일 수 있음)
- 통합 테스트 `npm run test:sync`는 jest-expo가 fetch를 바꿔서 별도 설정 `jest.sync-it.config.js` 사용
- 개발 빌드 전용 `amajdaigeo://dev-login?token=` 딥링크로 로컬 스택 테스트 계정 로그인

## Share System
- 2가지 형식: 앱으로 보내기 (Base64 데이터 포함) / 텍스트만 보내기
- v2 필드(section·reason·baggage·source·cautions)는 전부 선택값 — 예전 앱이 보낸 데이터도 받아야 함 (`shareUtils.test.ts`)
- #CHECKLIST_DATA#...#END# 마커로 체크리스트 데이터 임베딩
- Play Store 링크 포함

## 여행지 템플릿 (v2)
- 데이터: `src/constants/travel/` (presets, destinations, companions, climate)
- 생성 엔진: `src/utils/templateEngine.ts` — `generateFromSituation`(기존 57개와 결과 동일), `generateFromDestination`(프리셋 + 국가 예외 + 동행자 + 상황 조합)
- 새 필드는 `kind`로 구분. `category`는 '생활/여행' 분류명이고 사용자 데이터 `categoryId`로 저장되므로 의미를 바꾸지 말 것
- 국가 예외값(입국서류 등)은 `lastVerifiedAt` + `sourceUrls` 필수 (테스트가 검사)

## Test
- `npm test` (jest-expo). 엔진 테스트: `src/utils/__tests__/templateEngine.test.ts`

## Template Quantity
- `calculateQuantity(item, peopleCount)` = `(baseQuantity || 1) * (item.multiplier || 1) * Math.max(1, peopleCount)`
- multiplier는 꼭 필요한 항목에만 (고기 등), 전체에 넣으면 시각적으로 혼란
