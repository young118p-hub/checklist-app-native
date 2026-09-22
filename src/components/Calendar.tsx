import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { IconButton, T, Tap } from './ui/kit';
import { makeStyles, useColors } from '../theme';
import { fromISODate, startOfToday, toISODate } from '../utils/format';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  start?: string;
  end?: string;
  range?: boolean;
  onChange: (start: string | undefined, end: string | undefined) => void;
}

// 한 달 달력. range면 첫 탭이 출발일, 두 번째 탭이 돌아오는 날
export const Calendar = ({ start, end, range, onChange }: Props) => {
  const s = useStyles();
  const c = useColors();
  const today = startOfToday();
  const todayISO = toISODate(today);
  const initial = start ? fromISODate(start) : today;
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const cells = useMemo(() => {
    const first = month.getDay();
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const list: (string | null)[] = Array(first).fill(null);
    for (let d = 1; d <= days; d++) list.push(toISODate(new Date(month.getFullYear(), month.getMonth(), d)));
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [month]);

  const canGoBack = month > new Date(today.getFullYear(), today.getMonth(), 1);

  const pick = (iso: string) => {
    if (!range) return onChange(iso, undefined);
    if (!start || end || iso < start) return onChange(iso, undefined);
    onChange(start, iso);
  };

  return (
    <View style={s.box}>
      <View style={s.head}>
        <View style={{ opacity: canGoBack ? 1 : 0.3 }}>
          <IconButton icon="back" label="이전 달" size={20}
            onPress={() => canGoBack && setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />
        </View>
        <T size={16} weight="semibold">{month.getFullYear()}년 {month.getMonth() + 1}월</T>
        <IconButton icon="chevronRight" label="다음 달" size={20}
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} />
      </View>
      <View style={s.week}>
        {WEEK.map(w => <T key={w} variant="caption" tone="text3" center style={{ flex: 1 }}>{w}</T>)}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, w) => (
      <View key={w} style={s.row}>
        {cells.slice(w * 7, w * 7 + 7).map((iso, i) => {
          if (!iso) return <View key={i} style={s.cell} />;
          const past = iso < todayISO;
          const isStart = iso === start;
          const isEnd = iso === end;
          const inRange = !!(start && end && iso > start && iso < end);
          const selected = isStart || isEnd;
          const day = Number(iso.slice(8));
          return (
            <View key={iso} style={s.cell}>
              {(inRange || (end && (isStart || isEnd) && start !== end)) && (
                <View style={[s.band, isStart && { left: '50%' }, isEnd && { right: '50%' }]} />
              )}
              <Tap
                accessibilityRole="button"
                accessibilityLabel={`${Number(iso.slice(5, 7))}월 ${day}일`}
                accessibilityState={{ selected, disabled: past }}
                disabled={past}
                onPress={() => pick(iso)}
                style={[s.day, selected && { backgroundColor: c.accentStrong }]}
              >
                <T
                  size={15}
                  weight={selected || iso === todayISO ? 'bold' : 'regular'}
                  tone={selected ? 'onAccent' : past ? 'placeholder' : iso === todayISO ? 'accentStrong' : 'text1'}
                >
                  {day}
                </T>
              </Tap>
            </View>
          );
        })}
      </View>
      ))}
    </View>
  );
};

const useStyles = makeStyles(c => ({
  box: { borderRadius: 20, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },
  head: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  week: { height: 32, flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  band: { position: 'absolute', left: 0, right: 0, height: 40, backgroundColor: c.accentWeak },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
}));
