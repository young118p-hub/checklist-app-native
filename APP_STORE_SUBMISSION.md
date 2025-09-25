# 🍎 Apple App Store 출시 완전 가이드

## 📋 **현재 진행 상황**
- ✅ DUNS 번호 신청 완료 (보통 5-10영업일 소요)
- 🔄 Apple Developer Program 등록 대기 중
- 📱 iOS 앱 빌드 준비 필요

## 🚀 **Apple Developer Program 등록**

### **1단계: DUNS 번호 확인**
DUNS 번호가 발급되면 이메일로 통지됩니다.
- D&B 웹사이트에서 번호 확인: https://www.dnb.com/duns-number/lookup.html

### **2단계: Apple Developer 계정 신청**
1. **https://developer.apple.com/programs/enroll/** 접속
2. **"Enroll as an Organization"** 선택
3. **Apple ID로 로그인** (없으면 생성)
4. **회사 정보 입력:**
   - Legal Entity Name: 사업자등록증상 상호
   - DUNS Number: 발급받은 번호
   - 주소, 전화번호 등
5. **연회비 $99 결제**

### **3단계: 등록 승인 대기**
- Apple 검토: 보통 1-7일 소요
- 추가 서류 요청 가능 (사업자등록증 등)

## 📱 **iOS 앱 빌드 준비**

### **현재 상태 확인**
app.json에서 iOS 설정이 이미 완료되어 있습니다:
- Bundle ID: com.checklist.amajdaigeo
- 앱 아이콘: 설정됨
- 빌드 번호: 1

### **iOS 빌드 생성**
Apple Developer 계정이 준비되면:

```bash
# iOS 빌드 (Apple Developer 계정 필요)
npx eas build --platform ios --profile production
```

## 📝 **App Store Connect 설정**

### **1단계: 앱 등록**
1. **https://appstoreconnect.apple.com** 접속
2. **"My Apps" → "+" → "New App"** 클릭
3. **앱 정보 입력:**
   - Platform: iOS
   - Name: 아맞다이거! - 체크리스트
   - Bundle ID: com.checklist.amajdaigeo
   - SKU: checklist-amajdaigeo-2024
   - User Access: Full Access

### **2단계: 앱 정보 설정**

#### **앱 정보 (App Information)**
- Category: Productivity (생산성)
- Secondary Category: Utilities (유틸리티)
- Content Rights: Does not use third-party content

#### **가격 및 출시 가능 여부**
- Price: Free (무료)
- Availability: All Countries

#### **앱 개인정보 보호**
- Privacy Policy URL: (필요시)
- App Privacy: 수집하는 데이터 유형 명시

### **3단계: 버전 정보**

#### **스크린샷**
이미 웹에서 캡처한 스크린샷을 사용:
- 6.7" Display (iPhone 14 Pro Max): 필수
- 6.5" Display (iPhone 11 Pro Max): 권장
- 12.9" Display (iPad Pro): 선택사항

#### **앱 미리보기 및 스크린샷**
- 최소 3개, 최대 10개 스크린샷
- 홈 화면, 체크리스트 상세, 템플릿 선택 화면 등

#### **설명**
```
🤦‍♂️ "아맞다이거!" - 깜빡할 뻔한 모든 것들을 한 번에!

한국인의 라이프스타일에 맞춘 완벽한 체크리스트 앱입니다. 출장, 여행, 캠핑, 차박 등 다양한 상황에서 필요한 모든 것들을 빠뜨리지 않고 준비할 수 있도록 도와드립니다.

✨ 주요 기능
🎯 상황별 맞춤 템플릿
- 출장 체크리스트
- 국내/해외 여행 체크리스트
- 캠핑 & 차박 체크리스트
- 이사 체크리스트
- 그리고 더 많은 템플릿들!

📝 스마트 체크리스트 관리
- 직관적인 체크리스트 생성 및 관리
- 수량과 단위 설정 가능
- 완료 상태 실시간 추적
- 진행률 시각화

👥 공유 & 협업
- 가족, 친구와 체크리스트 공유
- 간편한 링크 공유

🎨 한국어 최적화
- 완전 한글 지원
- 한국 문화에 맞는 UI/UX
- 직관적인 한국식 디자인

🚀 특별한 점
- 오프라인 지원: 인터넷 없어도 완벽 동작
- 빠른 속도: 즉시 로딩되는 반응형 인터페이스
- 개인정보 보호: 모든 데이터는 안전하게 로컬 저장
- 무료: 광고 없는 깔끔한 경험

더 이상 "아, 그거 챙기는 걸 깜빡했다!"라고 후회하지 마세요.
"아맞다이거!"와 함께 완벽한 준비를 시작하세요! 🎉
```

#### **키워드**
```
checklist,todo,travel,camping,productivity,체크리스트,할일,여행,캠핑,출장
```

#### **지원 URL**
웹사이트가 있다면 입력, 없으면 앱의 웹 버전 URL

#### **마케팅 URL**
선택사항 - 앱 소개 페이지 URL

### **4단계: 빌드 업로드**
```bash
# iOS 빌드 완료 후 자동으로 App Store Connect에 업로드됨
npx eas submit --platform ios
```

### **5단계: 검토 제출**
1. **TestFlight 베타 테스트** (선택사항)
   - 내부 테스터에게 먼저 배포
   - 피드백 수집 후 개선

2. **App Store 검토 제출**
   - 모든 정보 입력 완료 후 "Submit for Review"
   - 검토 기간: 보통 24-48시간 (최대 7일)

## 📊 **Google Play vs App Store 비교**

| 항목 | Google Play | App Store |
|------|-------------|-----------|
| 개발자 등록비 | $25 (일회성) | $99/년 |
| 검토 시간 | 1-3일 | 1-2일 |
| 승인율 | ~95% | ~85% |
| 정책 엄격도 | 보통 | 엄격 |

## ⚠️ **주의사항**

### **iOS 빌드 요구사항**
- **macOS 환경** 또는 **EAS Build 클라우드** 필요
- **Xcode** (macOS에서만 가능)
- **Apple Developer 계정** 필수

### **App Store 검토 가이드라인**
- 완전한 기능이 구현되어야 함
- 광고나 결제 기능 정책 준수
- 사용자 인터페이스 품질 기준 충족
- 개인정보 보호 정책 준수

## 🎯 **추천 진행 순서**

### **현재 (Google Play 먼저)**
1. ✅ Android APK 빌드
2. ✅ Google Play Console 등록
3. ✅ Android 앱 출시

### **DUNS 번호 발급 후**
4. ✅ Apple Developer Program 등록
5. ✅ iOS 빌드 생성
6. ✅ App Store Connect 설정
7. ✅ iOS 앱 출시

이렇게 하면 Android를 먼저 출시하여 사용자 피드백을 받고,
동시에 iOS도 준비할 수 있습니다!

## 🚀 **즉시 가능한 작업**

DUNS 번호 대기 중에도 할 수 있는 것들:
- ✅ Google Play Console 등록 ($25)
- ✅ Android APK 빌드 및 출시
- ✅ 웹 버전 배포 (Vercel/Netlify)
- ✅ 사용자 피드백 수집
- ✅ iOS용 스크린샷 최적화