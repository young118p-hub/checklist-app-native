# Supabase 연결 가이드

앱은 `.env`가 없으면 지금처럼 **기기 전용**으로 동작한다 (로그인·함께 챙기기 메뉴가 숨겨짐).
아래를 끝내고 `.env`를 채우면 켜진다.

## 1. 프로젝트 만들기
- supabase.com → New project, **Region: Northeast Asia (Seoul)** — 국외 이전 고지 절차를 피하려고 서울.
- 무료 플랜은 7일 동안 요청이 없으면 일시정지되고 백업이 없다. 출시 후 사용자가 생기면 Pro로.

## 2. 스키마 적용
SQL Editor에서 `migrations/` 파일을 **이름 순서대로** 실행한다.
1. `20260922000000_init.sql` — 테이블, 권한 규칙(RLS), 초대·계정 삭제 함수, Realtime
2. `20260923000000_sync_additions.sql` — 주의할 점 컬럼, 로그인 전 초대 미리보기

(Supabase CLI를 쓰면 `supabase link` 후 `supabase db push`)

적용 후 한 번 확인할 것: 테스트 계정으로 앱에서 **계정 삭제**를 실행해 `auth.users`에서 지워지는지.
로컬 테스트에서는 되지만 실제 Supabase의 권한 설정에서는 확인하지 못했다.

## 3. 로그인 공통
Authentication → URL Configuration → **Redirect URLs**에 추가:
```
amajdaigeo://auth-callback
```

각 로그인 서비스에 등록할 콜백 주소는 모두 같다:
```
https://<프로젝트 ref>.supabase.co/auth/v1/callback
```

## 4. 카카오
1. developers.kakao.com → 애플리케이션 추가
2. 카카오 로그인 활성화, Redirect URI에 위 콜백 주소
3. 동의 항목: 닉네임, 프로필 사진. **이메일(account_email)은 비즈 앱 인증이 있어야 받을 수 있다.**
4. 보안 → Client Secret 발급·활성화
5. Supabase Authentication → Providers → Kakao: REST API 키(Client ID)와 Client Secret 입력
6. 이메일 없이 가입이 막히면 Kakao 제공자 설정의 "이메일 없는 사용자 허용" 옵션을 확인한다 (대시보드 버전에 따라 이름이 다를 수 있음, 미확인)

## 5. Google
1. Google Cloud Console → OAuth 동의 화면 설정
2. 사용자 인증 정보 → OAuth 클라이언트 ID → **웹 애플리케이션**, 승인된 리디렉션 URI에 위 콜백 주소
3. Supabase Providers → Google에 Client ID / Secret 입력

## 6. 네이버 (확인 필요)
Supabase의 커스텀 OAuth2 제공자로 붙인다. 네이버 사용자 정보 응답이 `{ response: { id, nickname, ... } }` 형태로
한 단계 안에 들어 있어서, **Supabase 속성 매핑이 이 구조를 읽을 수 있는지 공식 문서로 확인하지 못했다.**
- 식별자: `custom:naver`, 종류: OAuth2
- Authorization URL `https://nid.naver.com/oauth2.0/authorize`
- Token URL `https://nid.naver.com/oauth2.0/token`
- Userinfo URL `https://openapi.naver.com/v1/nid/me`
- 이메일 선택(email_optional) 켜기
- 무료 플랜은 커스텀 제공자 3개까지

실제로 로그인해서 사용자가 만들어지면 `.env`의 `EXPO_PUBLIC_AUTH_NAVER=1`로 버튼을 켠다.
안 되면 Edge Function 하나로 네이버 토큰을 확인하고 세션을 만드는 방식으로 바꾼다.

## 7. 앱 설정 (.env)
`.env.example`을 복사해 `.env`로 만들고 Project Settings → API 값을 넣는다.
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (anon 키는 공개돼도 되는 키. **service_role 키는 절대 넣지 말 것**)
- `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL` — 로그인 시트의 이용약관·개인정보처리방침 링크. 출시 전 필수(계정·공유가 생겨서 개인정보처리방침 개정 필요)

`.env`를 바꾼 뒤에는 Metro를 다시 시작해야 반영된다.

## 8. 초대 링크
지금 초대 메시지는 `amajdaigeo://invite/<코드>` 형태다. 카카오톡 등에서 이 주소가 눌리지 않을 수 있어서
메시지에 "앱 설정 > 공유받은 리스트 가져오기에 붙여 넣기" 안내를 넣어 두었다.
눌리는 링크(https)를 쓰려면 **링크용 도메인**과 Android App Links 설정이 필요하다 (다음 단계).

## 테스트
- `npm run test:db` — PGlite로 권한 규칙 테스트 (추가 설치 없음)
- `npm run test:sync` — PGlite + PostgREST로 만든 로컬 미니 Supabase에 앱 동기화 엔진을 붙여 보는 통합 테스트.
  PostgREST 바이너리와 libpq가 필요하다: `brew install libpq`, PostgREST 릴리스에서 macos 바이너리를 받아 `POSTGREST_BIN`으로 지정.
  로그인(GoTrue)과 Realtime은 로컬 스택에 없어서 이 테스트로는 확인되지 않는다.
