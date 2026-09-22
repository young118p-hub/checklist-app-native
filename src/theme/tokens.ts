// v2 디자인 토큰 (design/v2/Tokens.dc.html 기준)
// 무채색 레이어 위에 코랄 포인트 한 가지. 빨강(danger)은 삭제에만 쓴다.

export interface ColorTokens {
  bg: string;            // 카드 없는 화면 바탕 (상세, 만들기)
  canvas: string;        // 카드가 올라가는 회색 바탕 (홈, 내 리스트)
  card: string;          // canvas 위 카드
  fill: string;          // 칩, 입력창, 회색 버튼
  fillSubtle: string;    // 카드 안 타일, 안내 박스
  raised: string;        // fill 위에 한 번 더 올라간 칩
  track: string;         // 진행률 바 바탕
  band: string;          // 섹션 사이 8px 띠
  border: string;
  control: string;       // 빈 체크박스 테두리, 꺼진 토글
  placeholder: string;   // 입력 힌트, 지난 날짜 등 비활성
  text1: string;
  text2: string;         // 회색 카드 안 작은 글자는 text2
  text3: string;
  accent: string;        // 진행률, 체크박스, 큰 숫자(D-3)
  accentStrong: string;  // 버튼 배경, 작은 코랄 글자, 링크
  onAccent: string;      // accentStrong 위 글자
  accentWeak: string;
  chipOn: string;
  onChipOn: string;
  danger: string;
  handle: string;
  overlay: string;
  shadow: string;
}

export const lightColors: ColorTokens = {
  bg: '#FFFFFF',
  canvas: '#F3F4F6',
  card: '#FFFFFF',
  fill: '#F3F4F6',
  fillSubtle: '#F8F9FA',
  raised: '#FFFFFF',
  track: '#F3F4F6',
  band: '#F3F4F6',
  border: '#E6E8EB',
  control: '#8A909B',
  placeholder: '#9EA4AE',
  text1: '#16181D',
  text2: '#5B616E',
  text3: '#6F7580',
  accent: '#F2553D',
  accentStrong: '#D43F27',
  onAccent: '#FFFFFF',
  accentWeak: '#FFF1EE',
  chipOn: '#16181D',
  onChipOn: '#FFFFFF',
  danger: '#D93A3A',
  handle: '#D5D8DD',
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: 'rgba(212, 63, 39, 0.28)',
};

export const darkColors: ColorTokens = {
  bg: '#111214',
  canvas: '#111214',
  card: '#1B1C20',
  fill: '#1F2125',
  fillSubtle: '#1F2125',
  raised: '#25272C',
  track: '#25272C',
  band: '#1B1C20',
  border: '#25272C',
  control: '#858B96',
  placeholder: '#6E747F',
  text1: '#EDEEF0',
  text2: '#A4A9B3',
  text3: '#858B96',
  accent: '#FF6B55',
  accentStrong: '#FF6B55',
  onAccent: '#16181D',
  accentWeak: '#3A211D',
  chipOn: '#EDEEF0',
  onChipOn: '#111214',
  danger: '#F0625D',
  handle: '#3A3C42',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

// 멤버 구분 (함께 챙기기). 색만으로 구분하지 않고 항상 이니셜과 함께 쓴다.
export const memberColors = ['#FFE3DC', '#E3ECFF', '#E4F5EA'];

// Android는 커스텀 폰트에 fontWeight가 먹지 않아서 굵기마다 파일을 따로 지정한다
export const fonts = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
};

const type = (fontSize: number, lineHeight: number, fontFamily: string) => ({
  fontSize,
  lineHeight,
  fontFamily,
  letterSpacing: -0.2,
});

export const typography = {
  display: type(28, 38, fonts.bold),
  title1: type(26, 36, fonts.bold),
  title2: type(22, 30, fonts.bold),
  title3: type(17, 24, fonts.bold),
  body1: type(16, 24, fonts.medium),
  body2: type(15, 22, fonts.regular),
  caption: type(13, 18, fonts.regular),
  label: type(12, 16, fonts.medium),
};

export const radius = { icon: 12, input: 14, button: 16, tile: 16, listCard: 20, card: 24, sheet: 28, pill: 999 };
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32, gutter: 20 };
