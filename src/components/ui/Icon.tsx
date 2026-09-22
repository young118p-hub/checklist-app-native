import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useColors } from '../../theme';

// 단색 라인 아이콘 (24px 격자, 기본 선 굵기 1.8). 시안 design/v2 의 아이콘을 그대로 옮기고,
// 시안에 없는 템플릿 아이콘은 같은 규칙으로 그렸다.
type Shape =
  | { p: string }
  | { c: [number, number, number] }
  | { r: [number, number, number, number, number] }
  | { dot: [number, number, number] };

const ICONS = {
  // 내비게이션·동작
  home: [{ p: 'M4 10.5L12 4l8 6.5V19a1 1 0 01-1 1h-4.5v-6h-5v6H5a1 1 0 01-1-1z' }],
  list: [{ p: 'M9 6.5h11M9 12h11M9 17.5h11' }, { p: 'M4 6.5l1 1 2-2M4 12l1 1 2-2M4 17.5l1 1 2-2' }],
  compass: [{ c: [12, 12, 8.5] }, { p: 'M15.5 8.5l-2 5-5 2 2-5z' }],
  sliders: [{ p: 'M4 7h10M18 7h2M4 17h4M12 17h8' }, { c: [16, 7, 2] }, { c: [10, 17, 2] }],
  search: [{ c: [11, 11, 7] }, { p: 'M20 20l-3.5-3.5' }],
  back: [{ p: 'M15 18l-6-6 6-6' }],
  chevronRight: [{ p: 'M9 6l6 6-6 6' }],
  chevronUp: [{ p: 'M6 15l6-6 6 6' }],
  chevronDown: [{ p: 'M6 9l6 6 6-6' }],
  arrowRight: [{ p: 'M5 12h14M13 6l6 6-6 6' }],
  plus: [{ p: 'M12 5v14M5 12h14' }],
  minus: [{ p: 'M5 12h14' }],
  check: [{ p: 'M5 12.5l4.5 4.5L19 7.5' }],
  close: [{ p: 'M18 6L6 18M6 6l12 12' }],
  share: [{ p: 'M12 3v12' }, { p: 'M7 8l5-5 5 5' }, { p: 'M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6' }],
  more: [{ dot: [12, 5, 1.7] }, { dot: [12, 12, 1.7] }, { dot: [12, 19, 1.7] }],
  refresh: [
    { p: 'M4 12a8 8 0 0113.7-5.6L20 8.5' }, { p: 'M20 4v4.5h-4.5' },
    { p: 'M20 12a8 8 0 01-13.7 5.6L4 15.5' }, { p: 'M4 20v-4.5h4.5' },
  ],
  bell: [{ p: 'M6 16V11a6 6 0 0112 0v5l1.5 2h-15z' }, { p: 'M10 20.5a2 2 0 004 0' }],
  message: [{ p: 'M4 5h16v11H9l-5 4z' }, { p: 'M8 9h8M8 12.5h5' }],
  link: [
    { p: 'M10 14a4.5 4.5 0 006.4 0l2.8-2.8a4.5 4.5 0 00-6.4-6.4L11.5 6' },
    { p: 'M14 10a4.5 4.5 0 00-6.4 0l-2.8 2.8a4.5 4.5 0 006.4 6.4l1.3-1.2' },
  ],
  mail: [{ r: [3, 5, 18, 14, 2] }, { p: 'M3.5 6l8.5 7 8.5-7' }],
  trash: [{ p: 'M4 7h16' }, { p: 'M9.5 7V4.5h5V7' }, { p: 'M6 7l1 13h10l1-13' }, { p: 'M10 11v5M14 11v5' }],
  pencil: [{ p: 'M4 20h4L19 9l-4-4L4 16z' }, { p: 'M13.5 6.5l4 4' }],
  download: [{ p: 'M12 4v11' }, { p: 'M7 10l5 5 5-5' }, { p: 'M5 20h14' }],
  calendar: [{ r: [3.5, 5, 17, 15, 2.5] }, { p: 'M3.5 10h17M8 3v4M16 3v4' }],
  moon: [{ p: 'M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z' }],
  info: [{ c: [12, 12, 8.5] }, { p: 'M12 11v5.5' }, { dot: [12, 7.8, 1.1] }],
  doc: [{ p: 'M6 3.5h8l4 4V20.5H6z' }, { p: 'M14 3.5v4h4M9 12h6M9 15.5h6' }],
  clipboard: [{ r: [5, 4.5, 14, 16, 2] }, { p: 'M9 4.5V3h6v1.5M9 10h6M9 14h4' }],

  // 템플릿 (시안)
  tent: [{ p: 'M3 20L12 4l9 16' }, { p: 'M9 20l3-6 3 6' }, { p: 'M2 20h20' }],
  car: [
    { p: 'M4 15l1.5-5A2 2 0 017.4 8.5h9.2a2 2 0 011.9 1.5L20 15v3a1 1 0 01-1 1h-1.5a1 1 0 01-1-1v-1h-9v1a1 1 0 01-1 1H5a1 1 0 01-1-1z' },
    { c: [7.5, 14, 1] }, { c: [16.5, 14, 1] },
  ],
  globe: [{ c: [12, 12, 8.5] }, { p: 'M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z' }],
  hospital: [{ r: [4, 4, 16, 16, 3] }, { p: 'M12 8v8M8 12h8' }],
  briefcase: [{ r: [3, 7, 18, 13, 2] }, { p: 'M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18' }],
  box: [{ p: 'M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z' }, { p: 'M3.5 7.5L12 12l8.5-4.5M12 12v9' }],
  dumbbell: [{ p: 'M6.5 8v8M17.5 8v8M3.5 10v4M20.5 10v4M6.5 12h11' }],
  heart: [{ p: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z' }],

  // 템플릿 (추가)
  plane: [{ p: 'M10.5 13.5L3 11l1.5-1.5 8 1 4-4a2 2 0 013 3l-4 4 1 8L15 23l-2.5-7.5' }, { p: 'M7 17l-3 1 1-3' }],
  book: [{ p: 'M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z' }, { p: 'M4 20.5A2.5 2.5 0 016.5 23H20v-5' }],
  baby: [{ c: [12, 12, 8.5] }, { dot: [9.3, 11, 1] }, { dot: [14.7, 11, 1] }, { p: 'M9.5 15a3.5 3.5 0 005 0' }, { p: 'M12 3.5c-1 1.5-1 3 .5 3.5' }],
  paw: [
    { p: 'M12 13c-3 0-5.5 2.6-5.5 5 0 1.5 1.2 2.5 2.7 2.2 1-.2 1.8-.7 2.8-.7s1.8.5 2.8.7c1.5.3 2.7-.7 2.7-2.2 0-2.4-2.5-5-5.5-5z' },
    { c: [6, 10, 1.8] }, { c: [9.5, 6, 1.8] }, { c: [14.5, 6, 1.8] }, { c: [18, 10, 1.8] },
  ],
  waves: [{ p: 'M2.5 9c2 0 2-1.5 4-1.5S8.5 9 10.5 9s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5' }, { p: 'M2.5 15c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5' }],
  snow: [{ p: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9' }, { p: 'M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5' }],
  mountain: [{ p: 'M2.5 20l7-12 4 6.5 2.5-3.5 5.5 9z' }],
  fish: [{ p: 'M3 12c3-4.5 9-6 13-2l4-3v10l-4-3c-4 4-10 2.5-13-2z' }, { dot: [8, 11, 1] }],
  basket: [{ p: 'M3.5 10h17l-2 10h-13z' }, { p: 'M8 10l3-6M16 10l-3-6M9 14v2.5M15 14v2.5' }],
  gift: [{ r: [3.5, 8, 17, 4, 1] }, { p: 'M5 12v8h14v-8M12 8v12' }, { p: 'M12 8c-1-3-5-4-5-1.5S11 8 12 8zM12 8c1-3 5-4 5-1.5S13 8 12 8z' }],
  music: [{ p: 'M9 18V5.5l11-2V16' }, { c: [6.5, 18, 2.5] }, { c: [17.5, 16, 2.5] }],
  ticket: [{ p: 'M3.5 8a2 2 0 002-2h13a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2h-13a2 2 0 00-2-2v-2a2 2 0 000-4z' }, { p: 'M14 6v12' }],
  sun: [{ c: [12, 12, 4] }, { p: 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4' }],
  flower: [{ c: [12, 9, 2.2] }, { p: 'M12 6.8C11 4 13 2.5 12 2.5S13 4 12 6.8M12 11.2V21M12 16c-2.5 0-4-1.5-4.5-3.5 2.5 0 4 1.5 4.5 3.5zM12 18c2.5 0 4-1.5 4.5-3.5-2.5 0-4 1.5-4.5 3.5z' }],
  flame: [{ p: 'M12 21c-4 0-6.5-2.8-6.5-6.2 0-3.3 2.5-5.3 3.5-8.3 1 2 2 2.5 2.5 2.5C12 6 13 4 15 3c-.5 3 3.5 5.5 3.5 11.8 0 3.4-2.5 6.2-6.5 6.2z' }],
  laptop: [{ r: [4.5, 5, 15, 10, 1.5] }, { p: 'M2.5 19h19' }],
  graduation: [{ p: 'M2.5 9L12 4.5 21.5 9 12 13.5z' }, { p: 'M6.5 11v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V11M21.5 9v5' }],
  shield: [{ p: 'M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z' }],
  wrench: [{ p: 'M14.5 6.5a4 4 0 015.2 5.2L12 19.5 8.5 16l7.8-7.7' }, { p: 'M4.5 20l4-4' }],
  key: [{ c: [8, 15, 4] }, { p: 'M11 12l8.5-8.5M16.5 6.5l2 2M14 9l2 2' }],
  bowl: [{ p: 'M3.5 11h17a8.5 8.5 0 01-17 0z' }, { p: 'M9 7c0-1.5 1-1.5 1-3M13.5 7c0-1.5 1-1.5 1-3' }],
  steam: [{ p: 'M4 20h16' }, { p: 'M6 16a6 6 0 0112 0' }, { p: 'M9 9c0-1.5 1-2 1-3.5M14 9c0-1.5 1-2 1-3.5' }],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const Icon = ({ name, size = 24, color, strokeWidth = 1.8 }: IconProps) => {
  const c = useColors();
  const stroke = color ?? c.text1;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {(ICONS[name] as Shape[]).map((s, i) => {
        if ('p' in s) {
          return <Path key={i} d={s.p} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />;
        }
        if ('c' in s) {
          return <Circle key={i} cx={s.c[0]} cy={s.c[1]} r={s.c[2]} stroke={stroke} strokeWidth={strokeWidth} />;
        }
        if ('r' in s) {
          const [x, y, w, h, rx] = s.r;
          return <Rect key={i} x={x} y={y} width={w} height={h} rx={rx} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />;
        }
        return <Circle key={i} cx={s.dot[0]} cy={s.dot[1]} r={s.dot[2]} fill={stroke} />;
      })}
    </Svg>
  );
};
