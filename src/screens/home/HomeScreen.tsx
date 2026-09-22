import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SITUATION_TEMPLATES } from '../../constants/templates';
import { HOME_TEMPLATE_IDS, getShortName, getTemplateIcon } from '../../constants/templateIcons';
import { useChecklistStore } from '../../stores/checklistStore';
import { Icon } from '../../components/ui/Icon';
import { FAB, ProgressBar, T, Tap } from '../../components/ui/kit';
import { useTabSwitch } from '../../navigation/tabs';
import { makeStyles, useColors } from '../../theme';
import { Checklist, RootStackParamList } from '../../types';
import { daysUntil, formatDday, formatMeta, getProgress, getStartDate } from '../../utils/format';

type Nav = StackNavigationProp<RootStackParamList>;

// 날짜가 다가오는 리스트 중 가장 가까운 것, 없으면 최근에 챙기던 리스트
export const pickUpcoming = (checklists: Checklist[]): { checklist: Checklist; dated: boolean } | null => {
  const open = checklists.filter(c => !getProgress(c).complete);
  const dated = open
    .filter(c => { const d = getStartDate(c); return d != null && daysUntil(d) >= 0; })
    .sort((a, b) => getStartDate(a)!.localeCompare(getStartDate(b)!));
  if (dated.length > 0) return { checklist: dated[0], dated: true };
  const recent = [...open].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return recent.length > 0 ? { checklist: recent[0], dated: false } : null;
};

const HomeScreen = () => {
  const s = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const switchTab = useTabSwitch();
  const checklists = useChecklistStore(st => st.checklists);

  const upcoming = useMemo(() => pickUpcoming(checklists), [checklists]);
  const templates = useMemo(
    () => HOME_TEMPLATE_IDS.map(id => SITUATION_TEMPLATES.find(t => t.id === id)).filter(t => t != null),
    [],
  );

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={[s.header, { paddingTop: insets.top }]}>
          <View style={s.logoRow}>
            <T size={18} weight="bold" style={{ letterSpacing: -0.4 }}>
              아맞다이거<T size={18} weight="bold" tone="accent">!</T>
            </T>
          </View>
          <T variant="title1" style={{ marginTop: 12 }}>무엇을 챙기러 가세요?</T>
          <Tap
            accessibilityRole="search"
            accessibilityLabel="템플릿 검색"
            onPress={() => switchTab('Browse', { focusSearch: true })}
            style={s.search}
          >
            <Icon name="search" size={20} color={c.text3} strokeWidth={2} />
            <T size={16} tone="placeholder">캠핑, 출장, 병원 입원</T>
          </Tap>
        </View>

        {upcoming ? (
          <UpcomingCard
            checklist={upcoming.checklist}
            dated={upcoming.dated}
            onPress={() => navigation.navigate('ChecklistDetail', { id: upcoming.checklist.id })}
          />
        ) : (
          <View style={s.card}>
            <T variant="title3">첫 리스트를 만들어 보세요</T>
            <T variant="body2" tone="text2" style={{ marginTop: 4 }}>
              상황을 고르면 준비물이 채워져요. 날짜를 정하면 전날 저녁에 알려드려요.
            </T>
          </View>
        )}

        <View style={[s.card, { paddingTop: 8 }]}>
          <View style={s.cardHeader}>
            <T variant="title3">상황별 템플릿</T>
            <Tap accessibilityRole="button" onPress={() => switchTab('Browse')} style={s.more}>
              <T size={14} tone="text2">모두 보기</T>
              <Icon name="chevronRight" size={16} color={c.text2} strokeWidth={2} />
            </Tap>
          </View>
          <View style={s.grid}>
            {templates.map(t => (
              <Tap
                key={t.id}
                accessibilityRole="button"
                accessibilityLabel={`${getShortName(t)} 템플릿으로 만들기`}
                onPress={() => navigation.navigate('Create', { templateId: t.id })}
                style={s.tile}
              >
                <Icon name={getTemplateIcon(t)} size={24} />
                <T size={14} weight="medium">{getShortName(t)}</T>
              </Tap>
            ))}
          </View>
        </View>
      </ScrollView>

      <FAB label="새 리스트" bottom={16} onPress={() => navigation.navigate('Create')} />
    </View>
  );
};

const UpcomingCard = ({ checklist, dated, onPress }: { checklist: Checklist; dated: boolean; onPress: () => void }) => {
  const s = useStyles();
  const c = useColors();
  const { total, done, ratio } = getProgress(checklist);
  const start = getStartDate(checklist);
  const meta = formatMeta(checklist);
  return (
    <Tap accessibilityRole="button" onPress={onPress} pressedOpacity={0.8} style={[s.card, { gap: 16, paddingBottom: 8 }]}>
      <View style={s.upcomingTop}>
        <View style={{ flex: 1, gap: 2 }}>
          <T size={14} weight="semibold" tone="accentStrong">{dated ? '다가오는 준비' : '챙기던 리스트'}</T>
          <T variant="title2" numberOfLines={1}>{checklist.title}</T>
          {!!meta && <T size={14} tone="text3">{meta}</T>}
        </View>
        {dated && start && <T variant="display" tone="accent">{formatDday(start)}</T>}
      </View>
      <ProgressBar ratio={ratio} />
      <View style={s.upcomingBottom}>
        <T variant="body2" tone="text2">{total}개 중 {done}개 챙겼어요</T>
        <View style={s.continue}>
          <T size={15} weight="semibold">이어서 챙기기</T>
          <Icon name="chevronRight" size={18} color={c.text1} strokeWidth={2} />
        </View>
      </View>
    </Tap>
  );
};

const useStyles = makeStyles(c => ({
  root: { flex: 1, backgroundColor: c.canvas },
  content: { gap: 12, paddingBottom: 96 },
  header: {
    backgroundColor: c.card, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 20,
  },
  logoRow: { height: 56, justifyContent: 'center' },
  search: {
    marginTop: 16, height: 52, borderRadius: 14, backgroundColor: c.fill,
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16,
  },
  card: { marginHorizontal: 12, backgroundColor: c.card, borderRadius: 24, padding: 20 },
  upcomingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  upcomingBottom: { height: 48, marginTop: -8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  continue: { height: 48, flexDirection: 'row', alignItems: 'center', gap: 2 },
  cardHeader: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  more: { height: 48, marginRight: -8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexBasis: '31%', flexGrow: 1, height: 88, borderRadius: 16, backgroundColor: c.fillSubtle,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
}));

export default HomeScreen;
