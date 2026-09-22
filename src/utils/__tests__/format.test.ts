/// <reference types="jest" />
import { cleanText, formatDday, formatRangeLabel, toISODate } from '../format';

describe('cleanText', () => {
  it('템플릿 문구의 이모지를 걷어내고 꿀팁 표기를 바꾼다', () => {
    expect(cleanText('💼 완벽한 출장을 위한 꿀팁 준비물')).toBe('완벽한 출장을 위한 꿀팁 준비물');
    expect(cleanText('업무용 + 🔥꿀팁: 여분 케이블')).toBe('업무용 + 꿀팁 · 여분 케이블');
    expect(cleanText('🔥꿀팁: 논아이롱 추천')).toBe('꿀팁 · 논아이롱 추천');
    expect(cleanText('✨ 정리 ❄️')).toBe('정리');
    expect(cleanText(undefined)).toBe('');
  });
});

describe('날짜 표시', () => {
  it('같은 달 기간은 끝 날짜의 월을 생략한다', () => {
    expect(formatRangeLabel('2026-09-26', '2026-09-30')).toBe('9월 26일~30일');
    expect(formatRangeLabel('2026-09-29', '2026-10-02')).toBe('9월 29일~10월 2일');
  });
  it('D-day', () => {
    const today = new Date();
    const plus = (n: number) => toISODate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));
    expect(formatDday(plus(0))).toBe('D-DAY');
    expect(formatDday(plus(3))).toBe('D-3');
    expect(formatDday(plus(-2))).toBe('D+2');
  });
});
