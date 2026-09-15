// Core types for the checklist app
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface ReminderSettings {
  id: string;
  checklistId: string;
  reminderType: 'time_based' | 'completion_based' | 'smart_contextual';
  scheduledTime?: Date;
  reminderText: string;
  isEnabled: boolean;
  createdAt: Date;
}

export interface NotificationActionData {
  type: 'open_checklist' | 'view_my_checklists' | 'browse_templates' | 'view_analytics';
  checklistId?: string;
}

export interface SmartNotification {
  id: string;
  type: 'reminder' | 'suggestion' | 'completion_celebration' | 'weekly_summary';
  title: string;
  message: string;
  actionData?: NotificationActionData;
  isRead: boolean;
  createdAt: Date;
  scheduledFor?: Date;
}

// 템플릿/여행지 생성 관련 공통 타입
export type TemplateKind = 'situation' | 'destination';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type CompanionType = 'baby' | 'kid' | 'senior' | 'pet';
export type ItemScope = 'shared' | 'personal';
export type BaggageRule = 'carry_on' | 'checked';

// 템플릿에서 생성할 때 항목에 붙는 추가 정보 (모두 선택, 기존 저장 데이터와 호환)
export interface GeneratedItemMeta {
  key?: string;                 // 병합용 고유 키
  section?: string;             // 서류, 의류, 전자기기 등
  quantityPerPerson?: number;   // 1인 기준 수량 (personal 항목만)
  scope?: ItemScope;            // 공유할 준비물 / 각자 챙길 준비물
  reason?: string;              // 왜 필요한가요
  baggage?: BaggageRule;        // 기내/위탁 규칙이 명확한 항목만
  addedBecause?: string[];      // 이번 리스트에 들어간 이유 ('일본 100V · A/B타입', '5일 기준')
}

export interface ChecklistItem extends GeneratedItemMeta {
  id: string;
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  isCompleted: boolean;
  order: number;
  checklistId: string;
  createdAt: Date;
  updatedAt: Date;
}

// 체크리스트가 어떤 템플릿/조건으로 만들어졌는지 (날짜·인원 변경 시 재계산용)
export interface ChecklistSource {
  kind: TemplateKind;
  templateId?: string;
  destinationId?: string;
  situationIds?: string[];
  startDate?: string;           // YYYY-MM-DD
  endDate?: string;             // YYYY-MM-DD
  peopleCount: number;
  companions?: CompanionType[];
  engineVersion: number;
}

export interface Checklist {
  id: string;
  title: string;
  description?: string;
  isTemplate: boolean;
  isPublic: boolean;
  peopleCount?: number;
  userId: string;
  categoryId?: string;
  source?: ChecklistSource;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  category?: Category | null;
  items: ChecklistItem[];
  _count: {
    likes: number;
    reviews: number;
    comments: number;
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface CreateChecklistData {
  title: string;
  description?: string;
  isTemplate?: boolean;
  isPublic?: boolean;
  peopleCount?: number;
  categoryId?: string;
  source?: ChecklistSource;
  items: ({
    title: string;
    description?: string;
    quantity?: number;
    unit?: string;
    order: number;
  } & GeneratedItemMeta)[];
}

export interface SituationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;             // '생활' | '여행' 등 분류명 (categoryId로 저장됨, 이름 변경 금지)
  kind?: 'situation';           // 없으면 situation
  peopleMultiplier: boolean;
  items: TemplateItem[];
}

export interface TemplateItem {
  title: string;
  description?: string;
  baseQuantity?: number;
  unit?: string;
  multiplier?: number;
  key?: string;
  section?: string;
  perDay?: number;              // 하루당 수량 (여행 기간이 있을 때만 적용)
  maxQuantity?: number;         // perDay 계산 상한 (세탁 가정 등)
  onlyFor?: CompanionType[];
  seasons?: Season[];
  where?: 'abroad' | 'domestic';
  reason?: string;
  baggage?: BaggageRule;
  scope?: ItemScope;            // 없으면 multiplier/perDay 유무로 추론
}

// 여행지 템플릿
export type ClimatePresetId = 'tropical_humid' | 'temperate' | 'longhaul_varied' | 'domestic';

export interface SeasonalAdjustment {
  add?: TemplateItem[];
  removeKeys?: string[];
  override?: Record<string, Partial<TemplateItem>>;
}

export interface ClimatePreset {
  id: ClimatePresetId;
  name: string;
  baseItems: TemplateItem[];
  seasonalAdjustments?: Partial<Record<Season, SeasonalAdjustment>>;
}

export interface PowerInfo {
  voltage: string;
  plugTypes: string[];
  needsAdapter: boolean;        // 한국 C/F 플러그가 그대로 안 맞으면 true
  note?: string;
}

export interface CountryExceptions {
  power: PowerInfo | null;      // 국내는 null
  entryItems: TemplateItem[];
  connectivityItems: TemplateItem[];
  cautions: string[];
  lastVerifiedAt: string;       // YYYY-MM-DD, 비어 있으면 미검증
  sourceUrls: string[];
  unverified?: string[];        // 공식 원문으로 확인하지 못해 재확인이 필요한 값
}

export interface Destination {
  kind: 'destination';
  id: string;
  name: string;
  aliases: string[];
  domestic: boolean;
  climatePresetId: ClimatePresetId;
  seasonPresetOverride?: Partial<Record<Season, ClimatePresetId>>;
  climateCityId?: string;       // 없으면 기온 숫자 대신 라벨만 표시
  climateLabel: Record<Season, string>;
  extraItems?: TemplateItem[];
  countryExceptions: CountryExceptions;
}

// Navigation types
export type RootStackParamList = {
  Main: undefined;
  ChecklistDetail: { id: string };
  Home: undefined;
  MyChecklists: undefined;
  Create: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  MyChecklists: undefined;
  Create: undefined;
};
