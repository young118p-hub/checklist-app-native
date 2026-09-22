import React, { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SITUATION_TEMPLATES } from '../../constants/templates';
import { getCategoryIcon, getTemplateIcon } from '../../constants/templateIcons';
import { useChecklistStore } from '../../stores/checklistStore';
import { Icon, IconName } from '../../components/ui/Icon';
import { Chip, FAB, IconButton, ProgressBar, SearchField, T, Tap, haptic } from '../../components/ui/kit';
import { makeStyles, useColors } from '../../theme';
import { Checklist, RootStackParamList } from '../../types';
import { daysUntil, formatDday, formatMeta, getProgress, getStartDate } from '../../utils/format';

type Nav = StackNavigationProp<RootStackParamList>;
type Filter = 'all' | 'open' | 'done';

export const getChecklistIcon = (checklist: Checklist): IconName => {
  if (checklist.source?.kind === 'destination') return checklist.source.destinationId === 'korea' ? 'plane' : 'globe';
  const templateId = checklist.source?.templateId;
  const template = templateId ? SITUATION_TEMPLATES.find(t => t.id === templateId) : undefined;
  if (template) return getTemplateIcon(template);
  const byTitle = SITUATION_TEMPLATES.find(t => t.name === checklist.title);
  return byTitle ? getTemplateIcon(byTitle) : getCategoryIcon(checklist.categoryId);
};

// 날짜 있는 것은 가까운 순, 날짜 없는 것은 최근 수정 순
const sortOpen = (a: Checklist, b: Checklist) => {
  const da = getStartDate(a);
  const db = getStartDate(b);
  const fa = da != null && daysUntil(da) >= 0;
  const fb = db != null && daysUntil(db) >= 0;
  if (fa && fb) return da!.localeCompare(db!);
  if (fa !== fb) return fa ? -1 : 1;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
};

const MyChecklistsScreen = () => {
  const s = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { checklists, deleteChecklist, resetChecklist } = useChecklistStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<TextInput>(null);

  const { open, done } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q ? checklists.filter(c => c.title.toLowerCase().includes(q)) : checklists;
    return {
      open: matched.filter(c => !getProgress(c).complete).sort(sortOpen),
      done: matched.filter(c => getProgress(c).complete)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    };
  }, [checklists, query]);

  const openDetail = (id: string) => navigation.navigate('ChecklistDetail', { id });

  const confirmDelete = (checklist: Checklist) => {
    haptic.light();
    Alert.alert(checklist.title, '이 리스트를 삭제할까요? 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteChecklist(checklist.id) },
    ]);
  };

  const reuse = async (checklist: Checklist) => {
    haptic.select();
    await resetChecklist(checklist.id);
    openDetail(checklist.id);
  };

  const toggleSearch = () => {
    if (searching) {
      setSearching(false);
      setQuery('');
    } else {
      setSearching(true);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  };

  const showOpen = filter !== 'done' && open.length > 0;
  const showDone = filter !== 'open' && done.length > 0;
  const empty = checklists.length === 0;

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.titleRow}>
          <T variant="title1">내 리스트</T>
          {!empty && (
            <View style={{ marginRight: -12 }}>
              <IconButton icon={searching ? 'close' : 'search'} label={searching ? '검색 닫기' : '리스트 검색'} onPress={toggleSearch} />
            </View>
          )}
        </View>
        {searching && (
          <SearchField ref={searchRef} value={query} onChangeText={setQuery} placeholder="리스트 이름" style={{ marginBottom: 8 }} />
        )}
        {!empty && (
          <View style={s.chips}>
            <Chip label={`전체 ${open.length + done.length}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label={`진행 중 ${open.length}`} selected={filter === 'open'} onPress={() => setFilter('open')} />
            <Chip label={`완료 ${done.length}`} selected={filter === 'done'} onPress={() => setFilter('done')} />
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {empty && (
          <View style={s.empty}>
            <Icon name="list" size={32} color={c.text3} />
            <T variant="title3" center>아직 만든 리스트가 없어요</T>
            <T variant="body2" tone="text2" center>'새 리스트'를 눌러 상황을 고르면{'\n'}준비물이 바로 채워져요</T>
          </View>
        )}
        {!empty && !showOpen && !showDone && (
          <T variant="body2" tone="text3" center style={{ marginTop: 40 }}>
            {query ? '찾는 리스트가 없어요' : filter === 'done' ? '다 챙긴 리스트가 아직 없어요' : '진행 중인 리스트가 없어요'}
          </T>
        )}

        {showOpen && (
          <>
            <T size={14} weight="semibold" tone="text2" style={s.sectionLabel}>진행 중</T>
            {open.map(c => (
              <OpenCard key={c.id} checklist={c} onPress={() => openDetail(c.id)} onLongPress={() => confirmDelete(c)} />
            ))}
          </>
        )}
        {showDone && (
          <>
            <T size={14} weight="semibold" tone="text2" style={[s.sectionLabel, showOpen && { height: 40 }]}>완료</T>
            {done.map(c => (
              <DoneCard key={c.id} checklist={c} onPress={() => openDetail(c.id)} onLongPress={() => confirmDelete(c)} onReuse={() => reuse(c)} />
            ))}
          </>
        )}
        {!empty && <T variant="caption" tone="text3" center style={{ marginTop: 12 }}>길게 누르면 삭제할 수 있어요</T>}
      </ScrollView>

      <FAB label="새 리스트" bottom={16} onPress={() => navigation.navigate('Create')} />
    </View>
  );
};

const OpenCard = ({ checklist, onPress, onLongPress }: { checklist: Checklist; onPress: () => void; onLongPress: () => void }) => {
  const s = useStyles();
  const c = useColors();
  const { total, done, ratio } = getProgress(checklist);
  const start = getStartDate(checklist);
  const days = start ? daysUntil(start) : undefined;
  const soon = days != null && days >= 0 && days <= 7;
  const meta = formatMeta(checklist) || '날짜 없음';
  return (
    <Tap accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} pressedOpacity={0.8} style={s.card}>
      <View style={s.cardTop}>
        <View style={[s.iconBox, soon && { backgroundColor: c.accentWeak }]}>
          <Icon name={getChecklistIcon(checklist)} size={22} color={soon ? c.accentStrong : c.text2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T size={16} weight="semibold" numberOfLines={1}>{checklist.title}</T>
          <T variant="caption" tone="text3" numberOfLines={1}>{meta}</T>
        </View>
        {start && days != null && days >= 0 && (
          soon
            ? <T size={20} weight="bold" tone="accent">{formatDday(start)}</T>
            : <T size={16} weight="semibold" tone="text2">{formatDday(start)}</T>
        )}
      </View>
      <View style={s.cardBottom}>
        <ProgressBar ratio={ratio} height={6} style={{ flex: 1 }} />
        <T variant="caption" tone="text2">{total}개 중 {done}개</T>
      </View>
    </Tap>
  );
};

const DoneCard = ({ checklist, onPress, onLongPress, onReuse }: {
  checklist: Checklist; onPress: () => void; onLongPress: () => void; onReuse: () => void;
}) => {
  const s = useStyles();
  const c = useColors();
  return (
    <Tap accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} pressedOpacity={0.8} style={[s.card, s.cardTop]}>
      <View style={s.iconBox}>
        <Icon name={getChecklistIcon(checklist)} size={22} color={c.text2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T size={16} weight="semibold" numberOfLines={1}>{checklist.title}</T>
        <T variant="caption" tone="text3">{checklist.items.length}개 모두 챙겼어요</T>
      </View>
      <Tap accessibilityRole="button" accessibilityLabel={`${checklist.title} 다시 쓰기`} onPress={onReuse} style={s.reuse}>
        <Icon name="refresh" size={14} color={c.accentStrong} strokeWidth={2.2} />
        <T size={13} weight="semibold" tone="accentStrong">다시 쓰기</T>
      </Tap>
    </Tap>
  );
};

const useStyles = makeStyles(c => ({
  root: { flex: 1, backgroundColor: c.canvas },
  header: { backgroundColor: c.card, paddingHorizontal: 20, paddingBottom: 16, gap: 4 },
  titleRow: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', gap: 8 },
  list: { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 96, gap: 10 },
  sectionLabel: { height: 32, paddingHorizontal: 8, textAlignVertical: 'bottom' },
  card: { backgroundColor: c.card, borderRadius: 20, padding: 16, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
  reuse: {
    height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.accentWeak,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  empty: { alignItems: 'center', gap: 8, marginTop: 80 },
}));

export default MyChecklistsScreen;
