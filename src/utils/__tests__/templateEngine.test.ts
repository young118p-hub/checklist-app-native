/// <reference types="jest" />
import { Destination, TemplateItem } from '../../types';
import { SITUATION_TEMPLATES, calculateQuantity } from '../../constants/templates';
import { ABROAD_CORE_ITEMS, CLIMATE_PRESETS, DOMESTIC_CORE_ITEMS } from '../../constants/travel/presets';
import { COMPANION_ITEMS } from '../../constants/travel/companions';
import { DESTINATIONS, getDestination } from '../../constants/travel/destinations';
import { CLIMATE_NORMALS, getClimateSummary } from '../../constants/travel/climate';
import {
  generateFromDestination,
  generateFromSituation,
  getItemKey,
  getSeason,
  getTripDays,
} from '../templateEngine';

const findByKey = <T extends { key?: string }>(items: T[], key: string): T[] => items.filter(item => item.key === key);

describe('상황 템플릿 하위호환', () => {
  // HomeScreen.createChecklistFromTemplate 의 기존 계산과 완전히 같아야 한다
  const legacyItems = (template: (typeof SITUATION_TEMPLATES)[number], count: number) =>
    template.items.map((item, index) => ({
      title: item.title,
      quantity: template.peopleMultiplier ? calculateQuantity(item, count) : (item.baseQuantity || 1),
      unit: item.unit || '',
      order: index,
    }));

  it.each(SITUATION_TEMPLATES.map(t => [t.id, t] as const))('%s: 인원 1~4명 결과가 기존과 같다', (_id, template) => {
    for (const count of [1, 2, 3, 4]) {
      const { data } = generateFromSituation(template, count);
      const actual = data.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        unit: item.unit || '',
        order: item.order,
      }));
      expect(actual).toEqual(legacyItems(template, count));
      expect(data.categoryId).toBe(template.category);
    }
  });

  it('인원 배수가 걸린 항목만 각자 챙길 준비물(personal)로 분류된다', () => {
    for (const template of SITUATION_TEMPLATES) {
      const { data } = generateFromSituation(template, 3);
      data.items.forEach((item, index) => {
        const expected = template.peopleMultiplier && template.items[index].multiplier != null ? 'personal' : 'shared';
        expect(item.scope).toBe(expected);
      });
    }
  });
});

describe('날짜 계산', () => {
  it('출발일과 도착일을 포함한 일수를 센다', () => {
    expect(getTripDays('2026-09-18', '2026-09-22')).toBe(5);
    expect(getTripDays('2026-09-18', '2026-09-18')).toBe(1);
    expect(getTripDays('2026-09-22', '2026-09-18')).toBeUndefined();
    expect(getTripDays('2026-09-18')).toBeUndefined();
  });

  it('월로 계절을 정한다', () => {
    expect(getSeason(new Date(2026, 2, 1))).toBe('spring');
    expect(getSeason(new Date(2026, 7, 31))).toBe('summer');
    expect(getSeason(new Date(2026, 10, 30))).toBe('autumn');
    expect(getSeason(new Date(2026, 11, 1))).toBe('winter');
    expect(getSeason(new Date(2026, 1, 28))).toBe('winter');
  });
});

describe('여행지 생성', () => {
  it('기간에 비례해 소모품 수량을 계산하고 1인 기준 수량도 남긴다', () => {
    const { data } = generateFromDestination({
      destinationId: 'japan', startDate: '2026-10-01', endDate: '2026-10-05', peopleCount: 2,
    });
    const [underwear] = findByKey(data.items, 'underwear');
    expect(underwear.quantityPerPerson).toBe(5);
    expect(underwear.quantity).toBe(10);
    expect(underwear.addedBecause).toContain('5일 기준');
  });

  it('긴 여행은 상한까지만 계산한다', () => {
    const { data } = generateFromDestination({
      destinationId: 'japan', startDate: '2026-10-01', endDate: '2026-10-14', peopleCount: 1,
    });
    expect(findByKey(data.items, 'underwear')[0].quantity).toBe(7);
  });

  it('날짜가 없으면 기본 수량을 쓰고 계절 항목은 넣지 않는다', () => {
    const { data } = generateFromDestination({ destinationId: 'japan', peopleCount: 2 });
    expect(findByKey(data.items, 'underwear')[0].quantity).toBe(6);
    expect(findByKey(data.items, 'winter_coat')).toHaveLength(0);
    expect(findByKey(data.items, 'light_jacket')).toHaveLength(0);
  });

  it('한국 플러그가 안 맞는 나라만 어댑터를 넣고 이유를 붙인다', () => {
    const japan = generateFromDestination({ destinationId: 'japan', peopleCount: 1 });
    const [adapter] = findByKey(japan.data.items, 'travel_adapter');
    expect(adapter.addedBecause).toContain('일본 100V · A/B타입');
    expect(adapter.quantity).toBe(1);

    const thailand = generateFromDestination({ destinationId: 'thailand', peopleCount: 1 });
    expect(findByKey(thailand.data.items, 'travel_adapter')).toHaveLength(0);
    expect(thailand.cautions.length).toBeGreaterThan(0);

    const korea = generateFromDestination({ destinationId: 'korea', peopleCount: 1 });
    expect(findByKey(korea.data.items, 'travel_adapter')).toHaveLength(0);
    expect(findByKey(korea.data.items, 'passport')).toHaveLength(0);
    expect(findByKey(korea.data.items, 'id_card')).toHaveLength(1);
  });

  it('계절 보정이 반영된다', () => {
    const winter = generateFromDestination({ destinationId: 'japan', startDate: '2027-01-10', endDate: '2027-01-12', peopleCount: 1 });
    expect(findByKey(winter.data.items, 'winter_coat')).toHaveLength(1);
    expect(findByKey(winter.data.items, 'winter_coat')[0].addedBecause).toContain('겨울 날씨');

    const summer = generateFromDestination({ destinationId: 'japan', startDate: '2026-07-10', endDate: '2026-07-12', peopleCount: 1 });
    expect(findByKey(summer.data.items, 'winter_coat')).toHaveLength(0);
    expect(findByKey(summer.data.items, 'sunscreen')).toHaveLength(1);
  });

  it('대만 여름은 동남아 프리셋으로 바뀐다', () => {
    const summer = generateFromDestination({ destinationId: 'taiwan', startDate: '2026-07-10', endDate: '2026-07-12', peopleCount: 1 });
    expect(findByKey(summer.data.items, 'insect_repellent')).toHaveLength(1);

    const winter = generateFromDestination({ destinationId: 'taiwan', startDate: '2027-01-10', endDate: '2027-01-12', peopleCount: 1 });
    expect(findByKey(winter.data.items, 'insect_repellent')).toHaveLength(0);
  });

  it('베트남은 겨울에만 가벼운 겉옷이 추가된다', () => {
    const winter = generateFromDestination({ destinationId: 'vietnam', startDate: '2026-12-20', endDate: '2026-12-24', peopleCount: 1 });
    expect(findByKey(winter.data.items, 'light_jacket')).toHaveLength(1);

    const summer = generateFromDestination({ destinationId: 'vietnam', startDate: '2026-07-10', endDate: '2026-07-12', peopleCount: 1 });
    expect(findByKey(summer.data.items, 'light_jacket')).toHaveLength(0);
  });

  it('섹션 순서대로 정렬되고 order가 다시 매겨진다', () => {
    const { data } = generateFromDestination({ destinationId: 'europe', peopleCount: 1 });
    expect(data.items[0].section).toBe('서류');
    data.items.forEach((item, index) => expect(item.order).toBe(index));
  });

  it('없는 여행지는 에러를 던진다', () => {
    expect(() => generateFromDestination({ destinationId: 'mars', peopleCount: 1 })).toThrow();
  });
});

describe('동행자', () => {
  it('반려동물은 해외에서 빠지고 안내 문구가 나온다', () => {
    const { data, notices } = generateFromDestination({ destinationId: 'japan', peopleCount: 2, companions: ['pet'] });
    expect(findByKey(data.items, 'pet_food')).toHaveLength(0);
    expect(notices[0]).toContain('반려동물 동반');
    expect(data.source?.companions).toBeUndefined();
  });

  it('국내 반려동물 항목은 인원을 곱하지 않고 기간만 반영한다', () => {
    const { data, notices } = generateFromDestination({
      destinationId: 'korea', startDate: '2026-10-01', endDate: '2026-10-03', peopleCount: 4, companions: ['pet'],
    });
    const [food] = findByKey(data.items, 'pet_food');
    expect(notices).toHaveLength(0);
    expect(food.scope).toBe('shared');
    expect(food.quantity).toBe(3);
    expect(food.addedBecause).toContain('반려동물 동반');
  });

  it('아기 동반 시 기저귀를 하루 8개 기준으로 계산한다', () => {
    const { data } = generateFromDestination({
      destinationId: 'thailand', startDate: '2026-11-01', endDate: '2026-11-03', peopleCount: 3, companions: ['baby'],
    });
    expect(findByKey(data.items, 'diapers')[0].quantity).toBe(24);
  });
});

describe('여행지 + 상황 조합', () => {
  it('같은 물건은 한 번만 들어가고 상황 항목은 상황 이름 섹션으로 묶인다', () => {
    const { data, notices } = generateFromDestination({
      destinationId: 'japan', peopleCount: 2, situationIds: ['airport_departure'],
    });
    expect(notices).toHaveLength(0);
    expect(data.title).toBe('일본 · 공항 출국');
    expect(findByKey(data.items, 'passport')).toHaveLength(1);
    expect(findByKey(data.items, 'passport')[0].quantity).toBe(2);
    expect(findByKey(data.items, 'power_bank')).toHaveLength(1);
    expect(findByKey(data.items, 'power_bank')[0].addedBecause).toContain('공항 출국');

    const neckPillow = data.items.find(item => item.title === '목베개');
    expect(neckPillow?.section).toBe('공항 출국');
  });

  it('인원 배수가 켜진 상황 템플릿은 인원을 반영한다', () => {
    const { data } = generateFromDestination({
      destinationId: 'vietnam', peopleCount: 3, situationIds: ['beach_trip'],
    });
    const beach = SITUATION_TEMPLATES.find(t => t.id === 'beach_trip')!;
    const multiplied = beach.items.find(item => item.multiplier != null)!;
    const generated = data.items.find(item => item.key === getItemKey(multiplied))!;
    expect(generated.quantity).toBeGreaterThanOrEqual(calculateQuantity(multiplied, 3));
  });

  it('없는 상황 id는 안내만 하고 나머지는 만든다', () => {
    const { data, notices } = generateFromDestination({ destinationId: 'korea', peopleCount: 1, situationIds: ['nope'] });
    expect(notices).toHaveLength(1);
    expect(data.items.length).toBeGreaterThan(0);
  });
});

describe('데이터 무결성', () => {
  const lists = {
    ABROAD_CORE_ITEMS,
    DOMESTIC_CORE_ITEMS,
    ...Object.fromEntries(CLIMATE_PRESETS.map(p => [`preset:${p.id}`, p.baseItems])),
    ...Object.fromEntries(Object.entries(COMPANION_ITEMS).map(([c, items]) => [`companion:${c}`, items])),
  };

  it.each(Object.entries(lists))('%s 안에서 key가 중복되지 않는다', (_name: string, items: TemplateItem[]) => {
    const keys = items.map(getItemKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('여행지 id가 중복되지 않고 모든 프리셋 참조가 존재한다', () => {
    const presetIds = new Set(CLIMATE_PRESETS.map(p => p.id));
    expect(new Set(DESTINATIONS.map(d => d.id)).size).toBe(DESTINATIONS.length);
    for (const destination of DESTINATIONS) {
      expect(presetIds.has(destination.climatePresetId)).toBe(true);
      for (const presetId of Object.values(destination.seasonPresetOverride ?? {})) {
        expect(presetIds.has(presetId)).toBe(true);
      }
    }
  });

  it('대표 도시 기후값은 12개월이 모두 있고 최고가 최저보다 높다', () => {
    for (const destination of DESTINATIONS.filter(d => d.climateCityId)) {
      const normal = CLIMATE_NORMALS[destination.climateCityId!];
      expect(normal).toBeDefined();
      expect(normal.monthly).toHaveLength(12);
      normal.monthly.forEach(({ hi, lo }) => expect(hi).toBeGreaterThan(lo));
    }
  });

  it('대표 도시가 없는 여행지는 기온 숫자 없이 라벨만 준다', () => {
    const vietnam = getClimateSummary(getDestination('vietnam')!, 'summer', 7);
    expect(vietnam.hi).toBeUndefined();
    expect(vietnam.label).toBeTruthy();

    const japan = getClimateSummary(getDestination('japan')!, 'autumn', 9);
    expect(japan).toMatchObject({ cityName: '도쿄', hi: 28, lo: 20 });
  });

  it.each(DESTINATIONS.filter(d => !d.domestic).map(d => [d.name, d] as const))(
    '%s 국가 예외값은 검증일과 출처가 있다',
    (_name: string, destination: Destination) => {
      expect(destination.countryExceptions.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(destination.countryExceptions.sourceUrls.length).toBeGreaterThan(0);
    },
  );
});
