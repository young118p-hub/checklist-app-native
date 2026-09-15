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

### app.json plugins
```json
"plugins": [
  "./plugins/withPageAlignment",
  ["expo-build-properties", { "android": { "compileSdkVersion": 36, "targetSdkVersion": 36 } }],
  ["expo-splash-screen", { "image": "./assets/splash-icon.png", "resizeMode": "contain", "backgroundColor": "#DC2626" }],
  "expo-font"
]
```

## v2 디자인
- 시안 작업 파일: `design/v2/*.dc.html` + `canvas.json`
- 포인트 컬러 코랄 #F2553D 한 가지, 나머지 무채색. 이모지 대신 단색 라인 아이콘

## Key Files
- `src/constants/templates.ts` - 템플릿 정의 + calculateQuantity() 수량 계산
- `src/utils/shareUtils.ts` - 공유 시스템 (#CHECKLIST_DATA# 마커 형식)
- `src/stores/checklistStore.ts` - Zustand 스토어
- `src/navigation/AppNavigator.tsx` - 네비게이션 (탭 + 스택)
- `plugins/withPageAlignment.js` - 16KB 페이지 대응 플러그인

## Share System
- 2가지 형식: 앱으로 보내기 (Base64 데이터 포함) / 텍스트만 보내기
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
