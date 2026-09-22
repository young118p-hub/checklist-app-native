import { Checklist } from '../types';

// 이모지(서로게이트 쌍, 기호, 변형 선택자) — Hermes에서 u 플래그 없이 동작하는 형태
const EMOJI = /(?:[\uD83C-\uD83E][\uDC00-\uDFFF])|[☀-➿⬀-⯿⌀-⏿️‍‼⁉]/g;

// 저장된 템플릿 문구의 이모지를 화면에서만 걷어낸다 (데이터는 그대로).
// '🔥꿀팁: 여분 케이블' → '꿀팁 · 여분 케이블'
export const cleanText = (text?: string | null): string =>
  (text ?? '')
    .replace(EMOJI, '')
    .replace(/꿀팁\s*:\s*/g, '꿀팁 · ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[+·,]\s*/, '')
    .trim();

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const toISODate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const fromISODate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const startOfToday = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// '9월 18일 (금)'
export const formatDateLabel = (iso: string, withWeekday = true): string => {
  const date = fromISODate(iso);
  const base = `${date.getMonth() + 1}월 ${date.getDate()}일`;
  return withWeekday ? `${base} (${WEEKDAYS[date.getDay()]})` : base;
};

export const formatRangeLabel = (start: string, end?: string): string => {
  if (!end || end === start) return formatDateLabel(start);
  const s = fromISODate(start);
  const e = fromISODate(end);
  const endText = s.getMonth() === e.getMonth() ? `${e.getDate()}일` : formatDateLabel(end, false);
  return `${s.getMonth() + 1}월 ${s.getDate()}일~${endText}`;
};

// 오늘 기준 남은 날짜. 오늘이면 0, 지났으면 음수
export const daysUntil = (iso: string): number =>
  Math.round((fromISODate(iso).getTime() - startOfToday().getTime()) / 86_400_000);

export const formatDday = (iso: string): string => {
  const n = daysUntil(iso);
  if (n === 0) return 'D-DAY';
  return n > 0 ? `D-${n}` : `D+${-n}`;
};

export const getStartDate = (checklist: Checklist): string | undefined => checklist.source?.startDate;
export const getEndDate = (checklist: Checklist): string | undefined => checklist.source?.endDate;

// '9월 18일 (금) · 4명'
export const formatMeta = (checklist: Checklist): string => {
  const start = getStartDate(checklist);
  const parts: string[] = [];
  if (start) parts.push(formatRangeLabel(start, getEndDate(checklist)));
  if ((checklist.peopleCount ?? 1) > 1) parts.push(`${checklist.peopleCount}명`);
  return parts.join(' · ');
};

export const getProgress = (checklist: Checklist) => {
  const total = checklist.items.length;
  const done = checklist.items.filter(i => i.isCompleted).length;
  return { total, done, ratio: total > 0 ? done / total : 0, complete: total > 0 && done === total };
};

// 숫자 뒤 단위: 4 + '개' → '4개'
export const formatQuantity = (quantity?: number, unit?: string): string =>
  `${quantity ?? 1}${unit || '개'}`;
