# 아맞다이거! - 체크리스트 앱

## Stack
- Expo SDK 53, React Native 0.79.6, React 19
- TypeScript, Zustand (상태관리)
- React Navigation 7 (bottom tabs + stack)
- Package: com.checklist.amajdaigeo

## Build Config
- versionCode: 25 (마지막 빌드)
- compileSdkVersion: 35, targetSdkVersion: 35
- 64-bit only (arm64-v8a, x86_64) - 16KB page size 대응
- Plugin: `plugins/withPageAlignment.js` - ABI 필터 + gradle.properties 설정

### app.json plugins
```json
"plugins": [
  "./plugins/withPageAlignment",
  ["expo-build-properties", { "android": { "compileSdkVersion": 35, "targetSdkVersion": 35 } }]
]
```

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

## Template Quantity
- `calculateQuantity(item, peopleCount)` = `(baseQuantity || 1) * (item.multiplier || 1) * Math.max(1, peopleCount)`
- multiplier는 꼭 필요한 항목에만 (고기 등), 전체에 넣으면 시각적으로 혼란
