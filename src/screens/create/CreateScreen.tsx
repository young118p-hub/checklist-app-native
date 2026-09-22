import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, ScrollView, TextInput, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { SITUATION_TEMPLATES } from '../../constants/templates';
import { getShortName, getTemplateIcon } from '../../constants/templateIcons';
import { DESTINATIONS, getDestination } from '../../constants/travel/destinations';
import { getClimateSummary } from '../../constants/travel/climate';
import { Calendar } from '../../components/Calendar';
import { Icon } from '../../components/ui/Icon';
import {
  BottomCTA, Button, Checkbox, Chip, ChipRow, Field, RoundButton, SearchField, StepHeader, T, Tap, Toggle, haptic,
} from '../../components/ui/kit';
import { filterTemplates, templateSubtitle, useCategories } from '../browse/BrowseScreen';
import { useChecklistStore } from '../../stores/checklistStore';
import { usePreferencesStore } from '../../stores/preferencesStore';
import { makeStyles, useColors } from '../../theme';
import { CompanionType, CreateChecklistData, RootStackParamList, SituationTemplate } from '../../types';
import { ENGINE_VERSION, generateFromDestination, generateFromSituation, getSeason, parseLocalDate } from '../../utils/templateEngine';
import { formatDateLabel, formatQuantity, formatRangeLabel, toISODate } from '../../utils/format';
import { getReminderDate } from '../../utils/reminders';

type Nav = StackNavigationProp<RootStackParamList>;
type StepKey = 'pick' | 'name' | 'country' | 'date' | 'people' | 'travelers';

const OVERSEAS = 'overseas_travel';
const DOMESTIC = 'travel';

const stepsFor = (template: SituationTemplate | undefined, blank: boolean): StepKey[] => {
  if (blank) return ['pick', 'name', 'date'];
  if (!template) return ['pick', 'date', 'people'];
  if (template.id === OVERSEAS) return ['pick', 'country', 'date', 'travelers'];
  if (template.id === DOMESTIC) return ['pick', 'date', 'travelers'];
  return template.peopleMultiplier ? ['pick', 'date', 'people'] : ['pick', 'date'];
};

const COMPANIONS: { type: CompanionType; label: string }[] = [
  { type: 'baby', label: '아기 동반' },
  { type: 'kid', label: '어린이' },
  { type: 'senior', label: '어르신' },
  { type: 'pet', label: '반려동물' },
];

const PEOPLE_PRESETS = [1, 2, 3, 4, 6, 8];

const CreateScreen = () => {
  const s = useStyles();
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Create'>>();
  const initialId = route.params?.templateId;
  const createChecklist = useChecklistStore(st => st.createChecklist);
  const reminderDefault = usePreferencesStore(st => st.reminderDefault);

  const [templateId, setTemplateId] = useState<string | undefined>(initialId);
  const [blank, setBlank] = useState(false);
  const [title, setTitle] = useState('');
  const [destinationId, setDestinationId] = useState<string | undefined>();
  const [startDateState, setStartDate] = useState<string | undefined>();
  const [endDateState, setEndDate] = useState<string | undefined>();
  const startDate = startDateState;
  const endDate = endDateState;
  const [reminder, setReminder] = useState(reminderDefault);
  const [people, setPeople] = useState(1);
  const [companions, setCompanions] = useState<CompanionType[]>([]);
  const [saving, setSaving] = useState(false);

  const template = SITUATION_TEMPLATES.find(t => t.id === templateId);
  const steps = stepsFor(template, blank);
  const firstIndex = initialId ? 1 : 0;
  const [index, setIndex] = useState(firstIndex);
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const travel = template?.id === OVERSEAS || template?.id === DOMESTIC;
  const effectiveDestination = template?.id === DOMESTIC ? 'korea' : destinationId;

  const back = () => {
    if (index > firstIndex) setIndex(index - 1);
    else navigation.goBack();
    return true;
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', back);
    return () => sub.remove();
  });

  const buildData = (noDate: boolean): CreateChecklistData => {
    const startDate = noDate ? undefined : startDateState;
    const endDate = noDate ? undefined : endDateState;
    const withReminder = (data: CreateChecklistData) => ({ ...data, reminder: reminder && !!startDate });
    if (blank) {
      return withReminder({
        title: title.trim(),
        isTemplate: false,
        isPublic: false,
        peopleCount: 1,
        source: startDate ? { kind: 'situation', startDate, peopleCount: 1, engineVersion: ENGINE_VERSION } : undefined,
        items: [],
      });
    }
    if (travel && effectiveDestination) {
      const result = generateFromDestination({
        destinationId: effectiveDestination, startDate, endDate: endDate ?? startDate, peopleCount: people, companions,
      });
      return withReminder({ ...result.data, cautions: result.cautions });
    }
    return withReminder(generateFromSituation(template!, people, { startDate }).data);
  };

  const finish = async (noDate = false) => {
    if (saving) return;
    setSaving(true);
    const id = await createChecklist(buildData(noDate));
    setSaving(false);
    if (!id) {
      Alert.alert('만들지 못했어요', '잠시 후 다시 시도해 주세요.');
      return;
    }
    haptic.success();
    navigation.replace('ChecklistDetail', { id });
  };

  const next = () => (isLast ? finish() : setIndex(index + 1));

  const skipDate = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    if (isLast) finish(true);
    else setIndex(index + 1);
  };

  const canNext =
    step === 'pick' ? !!template || blank
      : step === 'name' ? title.trim().length > 0
        : step === 'country' ? !!destinationId
          : step === 'date' ? !!startDate
            : true;

  const header = {
    step: index + 1,
    total: steps.length,
    onBack: back,
    closeIcon: index === firstIndex,
  };

  return (
    <View style={s.root}>
      {step === 'pick' && (
        <PickStep
          header={header}
          selectedId={blank ? undefined : templateId}
          onSelect={id => { setBlank(false); setTemplateId(id); }}
          onBlank={() => { setTemplateId(undefined); setBlank(true); setIndex(1); }}
        />
      )}
      {step === 'name' && <NameStep header={header} title={title} onChange={setTitle} onSubmit={() => canNext && next()} />}
      {step === 'country' && <CountryStep header={header} selectedId={destinationId} onSelect={setDestinationId} />}
      {step === 'date' && (
        <DateStep
          header={header}
          range={travel}
          start={startDate}
          end={endDate}
          onChange={(a, b) => { setStartDate(a); setEndDate(b); }}
          reminder={reminder}
          onReminder={setReminder}
          onSkip={skipDate}
        />
      )}
      {step === 'people' && template && <PeopleStep header={header} template={template} people={people} onChange={setPeople} />}
      {step === 'travelers' && effectiveDestination && (
        <TravelersStep
          header={header}
          destinationId={effectiveDestination}
          startDate={startDate}
          endDate={endDate}
          people={people}
          onPeople={setPeople}
          companions={companions}
          onCompanions={setCompanions}
        />
      )}

      <BottomCTA>
        <Button
          label={isLast ? '리스트 만들기' : '다음'}
          disabled={!canNext || saving}
          onPress={next}
        />
      </BottomCTA>
    </View>
  );
};

interface HeaderProps { step: number; total: number; onBack: () => boolean | void; closeIcon: boolean }

// ───────────── 1. 상황 ─────────────

const PickStep = ({ header, selectedId, onSelect, onBlank }: {
  header: HeaderProps; selectedId?: string; onSelect: (id: string) => void; onBlank: () => void;
}) => {
  const s = useStyles();
  const c = useColors();
  const categories = useCategories();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const results = useMemo(() => filterTemplates(query, category), [query, category]);

  return (
    <>
      <StepHeader {...header} onBack={() => { header.onBack(); }} title="어떤 준비를 하세요?" subtitle="템플릿을 고르면 준비물이 채워져요" />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <SearchField value={query} onChangeText={setQuery} placeholder="상황 검색 (초성도 돼요)" />
        <ChipRow style={{ paddingTop: 16, paddingBottom: 16 }}>
          <Chip label="전체" selected={category == null} onPress={() => setCategory(null)} />
          {categories.map(cat => (
            <Chip key={cat} label={cat} selected={category === cat} onPress={() => setCategory(category === cat ? null : cat)} />
          ))}
        </ChipRow>
        <View style={s.grid}>
          <Tap
            accessibilityRole="button"
            onPress={() => { haptic.select(); onBlank(); }}
            pressedOpacity={0.8}
            style={[s.tile, s.tileBlank]}
          >
            <View style={s.tileIcon}><Icon name="plus" size={22} strokeWidth={2} /></View>
            <View style={{ flex: 1 }}>
              <T size={16} weight="semibold" numberOfLines={1}>빈 리스트</T>
              <T variant="caption" tone="text3" numberOfLines={1}>직접 채워요</T>
            </View>
          </Tap>
          {results.map(t => {
            const on = t.id === selectedId;
            return (
              <Tap
                key={t.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => { haptic.select(); onSelect(t.id); }}
                pressedOpacity={0.8}
                style={[s.tile, on && s.tileOn]}
              >
                <View style={[s.tileIcon, on && { backgroundColor: c.bg }]}>
                  <Icon name={getTemplateIcon(t)} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <T size={16} weight="semibold" numberOfLines={1}>{getShortName(t)}</T>
                  <T variant="caption" tone={on ? 'text2' : 'text3'} numberOfLines={1}>{templateSubtitle(t)}</T>
                </View>
              </Tap>
            );
          })}
        </View>
        {results.length === 0 && (
          <T variant="body2" tone="text3" center style={{ marginTop: 24 }}>찾는 상황이 없어요. 빈 리스트로 시작해 보세요</T>
        )}
      </ScrollView>
    </>
  );
};

// ───────────── 빈 리스트 이름 ─────────────

const NameStep = ({ header, title, onChange, onSubmit }: {
  header: HeaderProps; title: string; onChange: (t: string) => void; onSubmit: () => void;
}) => {
  const s = useStyles();
  const ref = useRef<TextInput>(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 300); }, []);
  return (
    <>
      <StepHeader {...header} onBack={() => { header.onBack(); }} title="리스트 이름을 정해 주세요" subtitle="항목은 만든 다음에 하나씩 추가할 수 있어요" />
      <View style={s.body}>
        <Field ref={ref} value={title} onChangeText={onChange} placeholder="예: 부산 출장, 주말 장보기" maxLength={40}
          returnKeyType="next" onSubmitEditing={onSubmit} />
      </View>
    </>
  );
};

// ───────────── 나라 ─────────────

// 나라 카드에 보여줄 대표 도시 (시안 기준). 유럽에 런던을 넣지 않는 건 영국만 어댑터가 필요해서
const CITY_EXAMPLES: Record<string, string[]> = {
  japan: ['도쿄', '오사카', '후쿠오카'],
  vietnam: ['다낭', '하노이', '나트랑'],
  thailand: ['방콕', '푸껫', '치앙마이'],
  taiwan: ['타이베이', '가오슝'],
  philippines: ['세부', '보라카이', '보홀'],
  usa: ['뉴욕', 'LA', '하와이'],
  europe: ['파리', '바르셀로나', '로마'],
};

const cityNames = (id: string, aliases: string[], name: string) =>
  CITY_EXAMPLES[id] ?? aliases.filter(a => /[가-힣]/.test(a) && a !== name).slice(0, 3);

const CountryStep = ({ header, selectedId, onSelect }: {
  header: HeaderProps; selectedId?: string; onSelect: (id: string) => void;
}) => {
  const s = useStyles();
  const c = useColors();
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DESTINATIONS.filter(d => !d.domestic)
      .filter(d => !q || d.name.includes(q) || d.aliases.some(a => a.toLowerCase().includes(q)));
  }, [query]);

  return (
    <>
      <StepHeader {...header} onBack={() => { header.onBack(); }} title="어느 나라로 가세요?" subtitle="전압과 입국 준비까지 맞춰서 챙겨드려요" />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <SearchField value={query} onChangeText={setQuery} placeholder="도시로 찾아도 돼요 (도쿄, 다낭)" />
        <View style={{ gap: 8, marginTop: 16 }}>
          {list.map(d => {
            const on = d.id === selectedId;
            return (
              <Tap
                key={d.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => { haptic.select(); onSelect(d.id); }}
                pressedOpacity={0.8}
                style={[s.option, on && s.tileOn]}
              >
                <View style={{ flex: 1 }}>
                  <T size={16} weight="semibold">{d.name}</T>
                  <T variant="caption" tone={on ? 'text2' : 'text3'}>{cityNames(d.id, d.aliases, d.name).join(' · ')}</T>
                </View>
                {d.countryExceptions.power?.needsAdapter && (
                  <View style={[s.badge, on && { backgroundColor: c.bg }]}>
                    <T size={12} weight="semibold" tone="text2">어댑터 필요</T>
                  </View>
                )}
                {on && <Checkbox checked size={24} />}
              </Tap>
            );
          })}
          {list.length === 0 && (
            <T variant="body2" tone="text3" center style={{ marginTop: 24 }}>
              아직 준비 중인 나라예요. 지금은 {DESTINATIONS.filter(d => !d.domestic).map(d => d.name).join(', ')}를 고를 수 있어요
            </T>
          )}
        </View>
      </ScrollView>
    </>
  );
};

// ───────────── 날짜 ─────────────

const addDays = (base: Date, n: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);

const quickDates = () => {
  const today = new Date();
  const dow = today.getDay();
  const saturday = addDays(today, dow === 6 ? 0 : (6 - dow + 7) % 7);
  const nextMonday = addDays(today, ((8 - dow) % 7) || 7);
  return [
    { label: '오늘', iso: toISODate(today) },
    { label: '내일', iso: toISODate(addDays(today, 1)) },
    { label: '이번 주말', iso: toISODate(saturday) },
    { label: '다음 주', iso: toISODate(nextMonday) },
  ];
};

const DateStep = ({ header, range, start, end, onChange, reminder, onReminder, onSkip }: {
  header: HeaderProps; range: boolean; start?: string; end?: string;
  onChange: (start?: string, end?: string) => void;
  reminder: boolean; onReminder: (on: boolean) => void; onSkip: () => void;
}) => {
  const s = useStyles();
  const c = useColors();
  const quick = useMemo(quickDates, []);
  const remindAt = start ? getReminderDate(start) : undefined;
  const canRemind = !!remindAt && remindAt.getTime() > Date.now();

  return (
    <>
      <StepHeader
        {...header}
        onBack={() => { header.onBack(); }}
        title="언제 떠나세요?"
        subtitle={range ? '출발일과 돌아오는 날을 차례로 눌러 주세요' : '날짜를 정하면 전날 잊지 않게 알려드려요'}
      />
      <ScrollView contentContainerStyle={s.body}>
        {!range && (
          <ChipRow style={{ paddingBottom: 20 }}>
            {quick.map(q => <Chip key={q.label} label={q.label} selected={start === q.iso} onPress={() => onChange(q.iso, undefined)} />)}
          </ChipRow>
        )}
        {range && (
          <T variant="body2" tone={start ? 'text1' : 'text3'} weight={start ? 'semibold' : 'regular'} style={{ marginBottom: 12 }}>
            {start ? `${formatRangeLabel(start, end)}${end ? '' : ' 출발 · 돌아오는 날을 눌러 주세요'}` : '출발일을 눌러 주세요'}
          </T>
        )}
        <Calendar range={range} start={start} end={end} onChange={onChange} />
        {start && (
          <View style={s.reminder}>
            <Icon name="bell" size={22} color={c.text2} />
            <View style={{ flex: 1, gap: 2 }}>
              <T size={15} weight="semibold">전날 저녁에 알림 받기</T>
              <T variant="caption" tone="text2">
                {canRemind ? `${formatDateLabel(toISODate(remindAt!))} 오후 8:00` : '출발이 너무 가까워서 알림은 건너뛰어요'}
              </T>
            </View>
            {canRemind && <Toggle label="전날 저녁에 알림 받기" value={reminder} onChange={onReminder} />}
          </View>
        )}
        <Tap accessibilityRole="button" onPress={onSkip} style={s.link}>
          <T size={15} weight="semibold" tone="text2">날짜 없이 만들기</T>
        </Tap>
      </ScrollView>
    </>
  );
};

// ───────────── 인원 (상황) ─────────────

const PeopleStep = ({ header, template, people, onChange }: {
  header: HeaderProps; template: SituationTemplate; people: number; onChange: (n: number) => void;
}) => {
  const s = useStyles();
  const c = useColors();
  const diff = useMemo(() => {
    const one = generateFromSituation(template, 1).data.items;
    const many = generateFromSituation(template, people).data.items;
    return many
      .map((item, i) => ({ item, before: one[i]?.quantity ?? 1 }))
      .filter(({ item, before }) => (item.quantity ?? 1) !== before);
  }, [template, people]);
  const total = template.items.length;
  const shown = diff.slice(0, 4);
  const rest = diff.slice(4);

  return (
    <>
      <StepHeader {...header} onBack={() => { header.onBack(); }} title="몇 명이 함께 가요?" subtitle="인원에 맞춰 수량을 계산해 드려요" />
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.stepper}>
          <RoundButton icon="minus" label="한 명 줄이기" disabled={people <= 1} onPress={() => onChange(Math.max(1, people - 1))} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <T size={56} weight="bold" style={{ lineHeight: 64 }}>{people}</T>
            <T size={22} weight="semibold" tone="text2">명</T>
          </View>
          <RoundButton icon="plus" label="한 명 늘리기" disabled={people >= 50} onPress={() => onChange(Math.min(50, people + 1))} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {PEOPLE_PRESETS.map(n => <Chip key={n} small label={`${n}명`} selected={people === n} onPress={() => onChange(n)} />)}
        </View>

        <View style={s.preview}>
          {people === 1 ? (
            <T variant="body2" tone="text2">1명 기준이에요. 인원을 늘리면 수량이 늘어나는 항목을 여기서 보여드려요</T>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <T size={15} weight="semibold">{people}명 기준으로 늘어난 항목</T>
                <T size={14} tone="text2">{diff.length}개</T>
              </View>
              <View style={{ marginTop: 12 }}>
                {shown.map(({ item, before }) => (
                  <View key={item.title} style={s.diffRow}>
                    <T size={15} style={{ flex: 1 }} numberOfLines={1}>{item.title}</T>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <T size={14} tone="text2">{formatQuantity(before, item.unit)}</T>
                      <Icon name="arrowRight" size={14} color={c.text3} strokeWidth={2} />
                      <T size={15} weight="bold" tone="accentStrong">{formatQuantity(item.quantity, item.unit)}</T>
                    </View>
                  </View>
                ))}
              </View>
              <T variant="caption" tone="text2" style={{ marginTop: 12 }}>
                {rest.length > 0 ? `${rest.map(r => r.item.title).slice(0, 3).join(', ')}${rest.length > 3 ? ` 외 ${rest.length - 3}개` : ''}도 늘었고 ` : ''}
                나머지 {total - diff.length}개는 그대로예요
              </T>
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
};

// ───────────── 인원·동행자 (여행) ─────────────

const TravelersStep = ({ header, destinationId, startDate, endDate, people, onPeople, companions, onCompanions }: {
  header: HeaderProps; destinationId: string; startDate?: string; endDate?: string;
  people: number; onPeople: (n: number) => void; companions: CompanionType[]; onCompanions: (c: CompanionType[]) => void;
}) => {
  const s = useStyles();
  const destination = getDestination(destinationId)!;
  const abroad = !destination.domestic;
  const result = useMemo(
    () => generateFromDestination({ destinationId, startDate, endDate: endDate ?? startDate, peopleCount: people, companions }),
    [destinationId, startDate, endDate, people, companions],
  );
  const climate = useMemo(() => {
    if (!startDate) return null;
    const d = parseLocalDate(startDate);
    return getClimateSummary(destination, getSeason(d), d.getMonth() + 1);
  }, [destination, startDate]);

  const items = result.data.items;
  const highlights = [...items]
    .sort((a, b) => (b.addedBecause?.length ? 1 : 0) - (a.addedBecause?.length ? 1 : 0))
    .slice(0, 4);

  const toggle = (type: CompanionType) =>
    onCompanions(companions.includes(type) ? companions.filter(c => c !== type) : [...companions, type]);

  const summary = [
    destination.domestic ? '국내' : destination.name,
    startDate ? formatRangeLabel(startDate, endDate) : '날짜 미정',
    `${people}명`,
  ].join(' · ');

  return (
    <>
      <StepHeader {...header} onBack={() => { header.onBack(); }} title="누구와 함께 가요?" subtitle="인원과 동행자에 맞춰 수량을 계산해요" />
      <ScrollView contentContainerStyle={s.body}>
        <View style={s.peopleRow}>
          <T size={16} weight="semibold" style={{ flex: 1 }}>인원</T>
          <RoundButton icon="minus" size={44} label="한 명 줄이기" disabled={people <= 1} onPress={() => onPeople(Math.max(1, people - 1))} />
          <T size={17} weight="bold" center style={{ width: 48 }}>{people}명</T>
          <RoundButton icon="plus" size={44} label="한 명 늘리기" disabled={people >= 50} onPress={() => onPeople(Math.min(50, people + 1))} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          {COMPANIONS.map(({ type, label }) => {
            const disabled = abroad && type === 'pet';
            return <Chip key={type} label={label} selected={companions.includes(type)} disabled={disabled} onPress={() => toggle(type)} />;
          })}
        </View>
        {abroad && <T variant="caption" tone="text2" style={{ marginTop: 8 }}>반려동물 동반은 국내 여행에서만 고를 수 있어요</T>}

        <View style={[s.preview, { marginTop: 20, padding: 16 }]}>
          <T size={15} weight="semibold">{summary}</T>
          {climate?.cityName && climate.hi != null && (
            <T variant="caption" tone="text2" style={{ marginTop: 4 }}>
              {climate.cityName} 기준 {climate.month}월 평균 최고 {climate.hi}° / 최저 {climate.lo}°
            </T>
          )}
          {climate
            ? <T variant="caption" tone="text2">{climate.label}</T>
            : <T variant="caption" tone="text2" style={{ marginTop: 4 }}>날짜를 정하면 계절에 맞춰 챙겨드려요</T>}
          <View style={s.divider} />
          <T size={14} weight="semibold" style={{ marginBottom: 4 }}>이렇게 챙겨드려요</T>
          {highlights.map(item => (
            <View key={item.key ?? item.title} style={s.highlight}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T size={15} weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{item.title}</T>
                  {abroad && item.baggage === 'carry_on' && <Badge label="기내만" />}
                </View>
                {!!(item.addedBecause?.length || item.reason) && (
                  <T variant="caption" tone="text2" numberOfLines={1}>
                    {item.addedBecause?.length ? item.addedBecause.join(' · ') : item.reason}
                  </T>
                )}
              </View>
              <T size={15} weight="semibold">{formatQuantity(item.quantity, item.unit)}</T>
            </View>
          ))}
          <T variant="caption" tone="text2" style={{ marginTop: 8 }}>
            외 {Math.max(0, items.length - highlights.length)}개 항목{result.cautions.length > 0 ? ` · 주의할 점 ${result.cautions.length}가지` : ''}
          </T>
        </View>
      </ScrollView>
    </>
  );
};

export const Badge = ({ label }: { label: string }) => {
  const c = useColors();
  return (
    <View style={{ height: 22, paddingHorizontal: 7, borderRadius: 11, borderWidth: 1, borderColor: c.border, justifyContent: 'center' }}>
      <T size={11} weight="semibold" tone="text2" style={{ lineHeight: 14 }}>{label}</T>
    </View>
  );
};

const useStyles = makeStyles(c => ({
  root: { flex: 1, backgroundColor: c.bg },
  body: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48.5%', flexGrow: 1, height: 76, borderRadius: 16, borderWidth: 1.5, borderColor: c.border,
    paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  tileOn: { borderColor: c.accent, backgroundColor: c.accentWeak },
  tileBlank: { borderStyle: 'dashed', borderColor: c.control },
  tileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
  link: { marginTop: 8, height: 48, paddingHorizontal: 16, alignSelf: 'center', justifyContent: 'center' },
  option: {
    minHeight: 64, borderRadius: 16, borderWidth: 1.5, borderColor: c.border, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  badge: { height: 26, paddingHorizontal: 8, borderRadius: 13, backgroundColor: c.fill, justifyContent: 'center' },
  reminder: {
    marginTop: 12, minHeight: 72, borderRadius: 16, backgroundColor: c.fillSubtle, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  stepper: { marginTop: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { marginTop: 32, borderRadius: 20, backgroundColor: c.fillSubtle, padding: 20 },
  diffRow: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  peopleRow: {
    height: 64, borderRadius: 16, borderWidth: 1, borderColor: c.border, paddingLeft: 16, paddingRight: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
  highlight: { minHeight: 48, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 12 },
}));

export default CreateScreen;
