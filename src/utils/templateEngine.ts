import {
  ChecklistSource,
  CompanionType,
  CreateChecklistData,
  ItemScope,
  Season,
  SituationTemplate,
  TemplateItem,
} from '../types';
import { SITUATION_TEMPLATES } from '../constants/templates';
import {
  ABROAD_CORE_ITEMS,
  CLIMATE_PRESETS,
  DOMESTIC_CORE_ITEMS,
  SECTION_ORDER,
  TITLE_KEY_ALIASES,
} from '../constants/travel/presets';
import { COMPANION_ITEMS, COMPANION_LABELS, DOMESTIC_ONLY_COMPANIONS } from '../constants/travel/companions';
import { getDestination } from '../constants/travel/destinations';

// 생성 규칙이 바뀌면 올린다 (저장된 source.engineVersion으로 재계산 여부 판단)
export const ENGINE_VERSION = 1;

export type GeneratedItem = CreateChecklistData['items'][number];

export interface GenerateResult {
  data: CreateChecklistData;
  cautions: string[];   // 리스트 상단에 보여줄 주의사항 (전압 안내, 국가 주의사항)
  notices: string[];    // 요청 중 반영하지 못한 조건 안내
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};

export const getSeason = (date: Date): Season => {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

export const parseLocalDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// 출발일~도착일을 포함한 일수 (4박 5일 → 5)
export const getTripDays = (startDate?: string, endDate?: string): number | undefined => {
  if (!startDate || !endDate) return undefined;
  const diff = Math.round((parseLocalDate(endDate).getTime() - parseLocalDate(startDate).getTime()) / 86400000);
  return diff >= 0 ? diff + 1 : undefined;
};

const normalizeTitle = (title: string) => title.replace(/\s+/g, '').toLowerCase();

export const getItemKey = (item: { key?: string; title: string }): string =>
  item.key ?? TITLE_KEY_ALIASES[item.title.replace(/\s+/g, '')] ?? normalizeTitle(item.title);

export const inferScope = (item: TemplateItem): ItemScope =>
  item.scope ?? (item.multiplier != null || item.perDay != null ? 'personal' : 'shared');

interface QuantityContext {
  peopleCount: number;
  tripDays?: number;
}

export const resolveItem = (
  item: TemplateItem,
  context: QuantityContext,
  addedBecause: string[] = [],
  order = 0,
): GeneratedItem => {
  const scope = inferScope(item);
  const usesDays = item.perDay != null && context.tripDays != null;

  let perUnit = usesDays ? Math.ceil(item.perDay! * context.tripDays!) : (item.baseQuantity || 1);
  if (usesDays && item.maxQuantity != null) perUnit = Math.min(perUnit, item.maxQuantity);
  perUnit = Math.max(1, perUnit);

  const perPerson = perUnit * (item.multiplier || 1);
  const quantity = scope === 'personal' ? perPerson * Math.max(1, context.peopleCount) : perUnit;
  const because = usesDays ? [...addedBecause, `${context.tripDays}일 기준`] : addedBecause;

  return {
    title: item.title,
    description: item.description,
    quantity,
    unit: item.unit,
    order,
    key: getItemKey(item),
    section: item.section,
    quantityPerPerson: scope === 'personal' ? perPerson : undefined,
    scope,
    reason: item.reason,
    baggage: item.baggage,
    addedBecause: because.length > 0 ? because : undefined,
  };
};

// 같은 key는 하나로 합친다. 단위가 같을 때만 큰 수량을 따르고, 다르면 먼저 들어온 쪽을 유지.
export const mergeItems = (items: GeneratedItem[]): GeneratedItem[] => {
  const merged = new Map<string, GeneratedItem>();

  for (const item of items) {
    const key = item.key ?? getItemKey(item);
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...item, key });
      continue;
    }

    const sameUnit = (prev.unit || '') === (item.unit || '');
    const because = Array.from(new Set([...(prev.addedBecause ?? []), ...(item.addedBecause ?? [])]));

    merged.set(key, {
      ...prev,
      quantity: sameUnit ? Math.max(prev.quantity ?? 1, item.quantity ?? 1) : prev.quantity,
      quantityPerPerson: sameUnit && item.quantityPerPerson != null
        ? Math.max(prev.quantityPerPerson ?? 0, item.quantityPerPerson)
        : prev.quantityPerPerson,
      scope: prev.scope === 'personal' || item.scope === 'personal' ? 'personal' : (prev.scope ?? item.scope),
      description: prev.description || item.description,
      section: prev.section ?? item.section,
      reason: prev.reason || item.reason,
      baggage: prev.baggage ?? item.baggage,
      addedBecause: because.length > 0 ? because : undefined,
    });
  }

  return Array.from(merged.values());
};

export const sortBySection = (items: GeneratedItem[]): GeneratedItem[] => {
  const firstSeen = new Map<string, number>();
  items.forEach((item, index) => {
    const section = item.section ?? '기타';
    if (!firstSeen.has(section)) firstSeen.set(section, index);
  });

  const rank = (section: string) => {
    const known = SECTION_ORDER.indexOf(section);
    return known >= 0 ? known : SECTION_ORDER.length + (firstSeen.get(section) ?? 0);
  };

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item.section ?? '기타') - rank(b.item.section ?? '기타') || a.index - b.index)
    .map(({ item }, order) => ({ ...item, order }));
};

// peopleMultiplier가 꺼진 템플릿은 기존 동작대로 인원을 반영하지 않는다
const itemsForSituation = (template: SituationTemplate): TemplateItem[] =>
  template.peopleMultiplier
    ? template.items
    : template.items.map(({ multiplier: _multiplier, ...rest }) => rest);

export const generateFromSituation = (
  template: SituationTemplate,
  peopleCount: number,
  options: { startDate?: string } = {},
): GenerateResult => {
  const count = Math.max(1, peopleCount);
  const context = { peopleCount: template.peopleMultiplier ? count : 1 };
  const source: ChecklistSource = {
    kind: 'situation',
    templateId: template.id,
    startDate: options.startDate,
    peopleCount: count,
    engineVersion: ENGINE_VERSION,
  };

  return {
    data: {
      title: template.name,
      description: template.description,
      isTemplate: false,
      isPublic: false,
      peopleCount: count,
      categoryId: template.category,
      source,
      items: itemsForSituation(template).map((item, index) => resolveItem(item, context, [], index)),
    },
    cautions: [],
    notices: [],
  };
};

export interface DestinationInput {
  destinationId: string;
  startDate?: string;
  endDate?: string;
  peopleCount: number;
  companions?: CompanionType[];
  situationIds?: string[];
}

interface Entry {
  item: TemplateItem;
  because: string[];
  ignorePeople?: boolean;
}

const formatDate = (isoDate: string) => {
  const date = parseLocalDate(isoDate);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};

export const generateFromDestination = (input: DestinationInput): GenerateResult => {
  const destination = getDestination(input.destinationId);
  if (!destination) throw new Error(`Unknown destination: ${input.destinationId}`);

  const abroad = !destination.domestic;
  const notices: string[] = [];
  const peopleCount = Math.max(1, input.peopleCount);

  let companions = Array.from(new Set(input.companions ?? []));
  if (abroad) {
    const unsupported = companions.filter(c => DOMESTIC_ONLY_COMPANIONS.includes(c));
    if (unsupported.length > 0) {
      companions = companions.filter(c => !unsupported.includes(c));
      notices.push(`${unsupported.map(c => COMPANION_LABELS[c]).join(', ')}은 아직 국내 여행에서만 지원해요`);
    }
  }

  const season = input.startDate ? getSeason(parseLocalDate(input.startDate)) : undefined;
  const presetId = (season && destination.seasonPresetOverride?.[season]) || destination.climatePresetId;
  const preset = CLIMATE_PRESETS.find(p => p.id === presetId);
  if (!preset) throw new Error(`Unknown climate preset: ${presetId}`);

  const isApplicable = (item: TemplateItem) =>
    (!item.seasons || (season != null && item.seasons.includes(season))) &&
    (!item.onlyFor || item.onlyFor.some(c => companions.includes(c))) &&
    (!item.where || (item.where === 'abroad') === abroad);

  let entries: Entry[] = [
    ...(abroad ? ABROAD_CORE_ITEMS : DOMESTIC_CORE_ITEMS).map(item => ({ item, because: [] })),
    ...preset.baseItems.map(item => ({ item, because: [] })),
  ];

  const adjustment = season ? preset.seasonalAdjustments?.[season] : undefined;
  if (adjustment && season) {
    const removeKeys = new Set(adjustment.removeKeys ?? []);
    entries = entries
      .filter(entry => !removeKeys.has(getItemKey(entry.item)))
      .map(entry => {
        const override = adjustment.override?.[getItemKey(entry.item)];
        return override ? { ...entry, item: { ...entry.item, ...override } } : entry;
      });
    entries.push(...(adjustment.add ?? []).map(item => ({ item, because: [`${SEASON_LABEL[season]} 날씨`] })));
  }

  const exceptions = destination.countryExceptions;
  const power = exceptions.power;
  if (power?.needsAdapter) {
    const plugs = power.plugTypes.join('/');
    entries.push({
      item: {
        key: 'travel_adapter',
        title: `여행용 어댑터 (${plugs}타입)`,
        section: '전자기기',
        unit: '개',
        scope: 'shared',
        reason: power.note ?? `${power.voltage} ${plugs}타입 콘센트라 한국 플러그가 맞지 않아요`,
      },
      because: [`${destination.name} ${power.voltage} · ${plugs}타입`],
    });
  }
  entries.push(...exceptions.entryItems.map(item => ({ item, because: [`${destination.name} 입국`] })));
  entries.push(...exceptions.connectivityItems.map(item => ({ item, because: [`${destination.name} 통신`] })));
  entries.push(...(destination.extraItems ?? []).map(item => ({ item, because: [destination.name] })));

  for (const companion of companions) {
    entries.push(...COMPANION_ITEMS[companion].map(item => ({ item, because: [COMPANION_LABELS[companion]] })));
  }

  const situations: SituationTemplate[] = [];
  for (const situationId of input.situationIds ?? []) {
    const template = SITUATION_TEMPLATES.find(t => t.id === situationId);
    if (!template) {
      notices.push(`'${situationId}' 상황 템플릿을 찾을 수 없어요`);
      continue;
    }
    situations.push(template);
    entries.push(...itemsForSituation(template).map(item => ({
      item: { ...item, section: item.section ?? template.name },
      because: [template.name],
      ignorePeople: !template.peopleMultiplier,
    })));
  }

  const tripDays = getTripDays(input.startDate, input.endDate);
  const resolved = entries
    .filter(entry => isApplicable(entry.item))
    .map((entry, index) => resolveItem(
      entry.item,
      { peopleCount: entry.ignorePeople ? 1 : peopleCount, tripDays },
      entry.because,
      index,
    ));

  const title = situations.length > 0
    ? `${destination.name} · ${situations.map(s => s.name).join(' · ')}`
    : `${destination.name} 여행`;

  const dateText = input.startDate && input.endDate
    ? `${formatDate(input.startDate)} ~ ${formatDate(input.endDate)}`
    : input.startDate ? formatDate(input.startDate) : undefined;

  const cautions = [
    ...(power?.note && !power.needsAdapter ? [power.note] : []),
    ...exceptions.cautions,
  ];

  return {
    data: {
      title,
      description: [dateText, `${peopleCount}명`].filter(Boolean).join(' · '),
      isTemplate: false,
      isPublic: false,
      peopleCount,
      categoryId: '여행',
      source: {
        kind: 'destination',
        destinationId: destination.id,
        situationIds: situations.length > 0 ? situations.map(s => s.id) : undefined,
        startDate: input.startDate,
        endDate: input.endDate,
        peopleCount,
        companions: companions.length > 0 ? companions : undefined,
        engineVersion: ENGINE_VERSION,
      },
      items: sortBySection(mergeItems(resolved)),
    },
    cautions,
    notices,
  };
};
