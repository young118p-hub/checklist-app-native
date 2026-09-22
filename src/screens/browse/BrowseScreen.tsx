import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { POPULAR_TEMPLATES, SITUATION_TEMPLATES } from '../../constants/templates';
import { CATEGORY_ORDER, getShortName, getTemplateIcon } from '../../constants/templateIcons';
import { Icon } from '../../components/ui/Icon';
import { Chip, ChipRow, SearchField, T, Tap } from '../../components/ui/kit';
import { useTabState } from '../../navigation/tabs';
import { makeStyles, useColors } from '../../theme';
import { RootStackParamList, SituationTemplate } from '../../types';
import { smartSearch } from '../../utils/smartSearch';
import { cleanText } from '../../utils/format';

type Nav = StackNavigationProp<RootStackParamList>;

// 여행 템플릿 중 나라·기간에 맞춰 만드는 것
export const TRAVEL_FLOW_IDS = ['overseas_travel', 'travel'];

export const templateSubtitle = (t: SituationTemplate) =>
  t.id === 'overseas_travel' ? '나라에 맞춰 만들어요'
    : t.id === 'travel' ? '기간에 맞춰 만들어요'
      : `${t.items.length}개 항목`;

export const useCategories = () => useMemo(() => {
  const present = new Set(SITUATION_TEMPLATES.map(t => t.category));
  return CATEGORY_ORDER.filter(c => present.has(c));
}, []);

// 인기 템플릿을 앞으로
const ORDERED = [
  ...POPULAR_TEMPLATES.map(id => SITUATION_TEMPLATES.find(t => t.id === id)).filter((t): t is SituationTemplate => t != null),
  ...SITUATION_TEMPLATES.filter(t => !POPULAR_TEMPLATES.includes(t.id)),
];

export const filterTemplates = (query: string, category: string | null) => {
  const base = query.trim() ? smartSearch(SITUATION_TEMPLATES, query.trim()) : ORDERED;
  return category ? base.filter(t => t.category === category) : base;
};

const BrowseScreen = () => {
  const s = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { activeTab, searchFocusToken } = useTabState();
  const categories = useCategories();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    if (searchFocusToken > 0) setTimeout(() => searchRef.current?.focus(), 250);
  }, [searchFocusToken]);

  useEffect(() => {
    if (activeTab !== 'Browse') Keyboard.dismiss();
  }, [activeTab]);

  const results = useMemo(() => filterTemplates(query, category), [query, category]);

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.titleRow}><T variant="title1">둘러보기</T></View>
        <SearchField
          ref={searchRef}
          value={query}
          onChangeText={setQuery}
          placeholder="상황 검색 (초성도 돼요)"
        />
        <ChipRow style={{ paddingTop: 12 }}>
          <Chip label="전체" selected={category == null} onPress={() => setCategory(null)} />
          {categories.map(cat => (
            <Chip key={cat} label={cat} selected={category === cat} onPress={() => setCategory(category === cat ? null : cat)} />
          ))}
        </ChipRow>
      </View>

      <FlatList
        data={results}
        keyExtractor={t => t.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <T size={14} weight="semibold" tone="text2" style={s.count}>
            {query.trim() ? `'${query.trim()}' 검색 결과 ${results.length}개` : `템플릿 ${results.length}개`}
          </T>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', gap: 8, marginTop: 40 }}>
            <T variant="title3">찾는 상황이 없어요</T>
            <T variant="body2" tone="text2" center>빈 리스트로 만들고 직접 채울 수 있어요</T>
            <Tap accessibilityRole="button" onPress={() => navigation.navigate('Create')} style={{ height: 48, justifyContent: 'center' }}>
              <T size={15} weight="semibold" tone="accentStrong">새 리스트 만들기</T>
            </Tap>
          </View>
        }
        renderItem={({ item }) => (
          <Tap
            accessibilityRole="button"
            onPress={() => navigation.navigate('Create', { templateId: item.id })}
            pressedOpacity={0.8}
            style={s.row}
          >
            <View style={s.iconBox}><Icon name={getTemplateIcon(item)} size={22} /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <T size={16} weight="semibold" numberOfLines={1}>{getShortName(item)}</T>
              <T variant="caption" tone="text3" numberOfLines={1}>
                {templateSubtitle(item)} · {cleanText(item.description)}
              </T>
            </View>
            <Icon name="chevronRight" size={18} color={c.text3} strokeWidth={2} />
          </Tap>
        )}
      />
    </View>
  );
};

const useStyles = makeStyles(c => ({
  root: { flex: 1, backgroundColor: c.canvas },
  header: { backgroundColor: c.card, paddingHorizontal: 20, paddingBottom: 16 },
  titleRow: { height: 56, justifyContent: 'center', marginBottom: 4 },
  list: { paddingHorizontal: 12, paddingBottom: 32, gap: 8 },
  count: { paddingHorizontal: 8, paddingTop: 16, paddingBottom: 4 },
  row: {
    backgroundColor: c.card, borderRadius: 20, paddingHorizontal: 16, minHeight: 76,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  iconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
}));

export default BrowseScreen;
