import { ClimatePreset, TemplateItem } from '../../types';

// 섹션 표시 순서 (여기에 없는 섹션은 뒤에 등장 순서대로)
export const SECTION_ORDER = [
  '서류',
  '돈·결제',
  '전자기기',
  '의류',
  '세면·위생',
  '의약품',
  '아기',
  '어린이',
  '어르신',
  '반려동물',
  '기타',
];

const underwear: TemplateItem = {
  key: 'underwear', title: '속옷', section: '의류', perDay: 1, maxQuantity: 7, baseQuantity: 3, unit: '벌', scope: 'personal',
  reason: '7일이 넘으면 중간에 세탁한다고 보고 7벌까지만 계산해요',
};
const socks: TemplateItem = {
  key: 'socks', title: '양말', section: '의류', perDay: 1, maxQuantity: 7, baseQuantity: 3, unit: '켤레', scope: 'personal',
};
const tops: TemplateItem = {
  key: 'tops', title: '상의', section: '의류', perDay: 1, maxQuantity: 5, baseQuantity: 3, unit: '벌', scope: 'personal',
};
const bottoms: TemplateItem = {
  key: 'bottoms', title: '하의', section: '의류', perDay: 0.5, maxQuantity: 3, baseQuantity: 2, unit: '벌', scope: 'personal',
};
const sleepwear: TemplateItem = { key: 'sleepwear', title: '잠옷', section: '의류', unit: '벌', scope: 'personal' };
const phoneCharger: TemplateItem = { key: 'phone_charger', title: '휴대폰 충전기·케이블', section: '전자기기', unit: '세트', scope: 'personal' };
const powerBank: TemplateItem = {
  key: 'power_bank', title: '보조배터리', section: '전자기기', unit: '개', scope: 'shared', baggage: 'carry_on',
  reason: '리튬 배터리는 위탁 수하물에 넣을 수 없어요',
};
const toiletries: TemplateItem = { key: 'toiletries', title: '세면도구', section: '세면·위생', unit: '세트', scope: 'personal' };
const suitcase: TemplateItem = { key: 'suitcase', title: '캐리어·여행 가방', section: '기타', unit: '개', scope: 'personal' };

const sunscreen: TemplateItem = {
  key: 'sunscreen', title: '선크림 (SPF50+)', section: '세면·위생', unit: '개', scope: 'shared',
};
const umbrella: TemplateItem = { key: 'umbrella', title: '접이식 우산', section: '기타', unit: '개', scope: 'shared' };
const walkingShoes: TemplateItem = {
  key: 'walking_shoes', title: '편한 운동화', section: '의류', unit: '켤레', scope: 'personal',
  reason: '여행 중에는 평소보다 훨씬 많이 걸어요',
};
const lightJacket: TemplateItem = {
  key: 'light_jacket', title: '가벼운 겉옷', section: '의류', unit: '벌', scope: 'personal',
  reason: '아침저녁 일교차가 커요',
};
const winterCoat: TemplateItem = { key: 'winter_coat', title: '두꺼운 외투', section: '의류', unit: '벌', scope: 'personal' };
const glovesScarf: TemplateItem = { key: 'gloves_scarf', title: '장갑·목도리', section: '의류', unit: '세트', scope: 'personal' };
const handWarmer: TemplateItem = {
  key: 'hand_warmer', title: '핫팩', section: '기타', perDay: 2, maxQuantity: 14, baseQuantity: 4, unit: '개', scope: 'personal',
};
const moisturizer: TemplateItem = {
  key: 'moisturizer', title: '보습크림·립밤', section: '세면·위생', unit: '세트', scope: 'personal',
  reason: '공기가 건조해서 피부와 입술이 쉽게 트요',
};
const handheldFan: TemplateItem = { key: 'handheld_fan', title: '휴대용 선풍기', section: '전자기기', unit: '개', scope: 'shared' };
const insectRepellent: TemplateItem = {
  key: 'insect_repellent', title: '모기 기피제', section: '의약품', unit: '개', scope: 'shared',
};

// 해외여행 공통 (기존 해외여행·공항 출국 템플릿에서 정리)
export const ABROAD_CORE_ITEMS: TemplateItem[] = [
  {
    key: 'passport', title: '여권', section: '서류', unit: '개', scope: 'personal',
    reason: '나라에 따라 남은 유효기간이 6개월 이상이어야 해요',
  },
  {
    key: 'flight_ticket', title: '항공권 (모바일·캡처)', section: '서류', unit: '매', scope: 'personal',
    reason: '휴대폰이 꺼질 때를 대비해 캡처나 출력본도 챙겨요',
  },
  {
    key: 'booking_confirmation', title: '숙소 예약 확인서', section: '서류', unit: '건', scope: 'shared',
    reason: '입국 심사에서 머물 곳을 물어볼 수 있어요',
  },
  {
    key: 'travel_insurance', title: '여행자보험', section: '서류', unit: '건', scope: 'personal',
    reason: '해외 병원비는 보험이 없으면 크게 나올 수 있어요',
  },
  {
    key: 'emergency_contacts', title: '비상 연락처 메모', section: '서류', unit: '장', scope: 'shared',
    description: '영사콜센터 +82-2-3210-0404',
    reason: '휴대폰을 잃어버려도 연락할 수 있게 종이에 적어둬요',
  },
  {
    key: 'overseas_card', title: '해외 결제 카드', section: '돈·결제', baseQuantity: 2, unit: '장', scope: 'shared',
    reason: '한 장이 막힐 때를 대비해 브랜드가 다른 카드로 2장',
  },
  {
    key: 'local_cash', title: '현지 화폐 (소액)', section: '돈·결제', unit: '세트', scope: 'shared',
    reason: '교통, 노점처럼 카드가 안 되는 곳이 있어요',
  },
  {
    key: 'data_plan', title: '유심·eSIM 또는 로밍', section: '전자기기', unit: '개', scope: 'personal',
    reason: '도착하자마자 지도와 번역 앱을 쓰려면 미리 준비해요',
  },
  powerBank,
  phoneCharger,
  {
    key: 'offline_maps', title: '지도·번역 앱 오프라인 저장', section: '전자기기', unit: '건', scope: 'shared',
    reason: '데이터가 끊겨도 길을 찾을 수 있어요',
  },
  underwear,
  socks,
  tops,
  bottoms,
  sleepwear,
  {
    key: 'liquids_bag', title: '액체류 지퍼백', section: '세면·위생', unit: '개', scope: 'personal', baggage: 'carry_on',
    reason: '기내에 들고 타는 액체는 100ml 이하 용기에 담아 1L 지퍼백 하나에 넣어요',
  },
  { ...toiletries, reason: '100ml가 넘는 용기는 위탁 수하물로 보내요' },
  {
    key: 'basic_medicine', title: '상비약', section: '의약품', description: '해열진통제·소화제·밴드', unit: '세트', scope: 'shared',
    reason: '해외에서는 같은 성분의 약을 찾기 어려워요',
  },
  suitcase,
];

// 국내여행 공통
export const DOMESTIC_CORE_ITEMS: TemplateItem[] = [
  { key: 'id_card', title: '신분증', section: '서류', unit: '개', scope: 'personal' },
  phoneCharger,
  { ...powerBank, reason: '비행기를 탄다면 위탁 수하물에 넣을 수 없어요' },
  underwear,
  socks,
  tops,
  bottoms,
  sleepwear,
  toiletries,
  {
    key: 'basic_medicine', title: '상비약', section: '의약품', description: '해열진통제·소화제·밴드', unit: '세트', scope: 'shared',
    reason: '늦은 시간에는 문 연 약국을 찾기 어려워요',
  },
  suitcase,
];

export const CLIMATE_PRESETS: ClimatePreset[] = [
  {
    id: 'tropical_humid',
    name: '동남아 · 덥고 습함',
    baseItems: [
      { ...sunscreen, reason: '자외선이 강해서 한국보다 금방 타요' },
      { key: 'sun_hat', title: '모자·선글라스', section: '의류', unit: '세트', scope: 'personal' },
      {
        key: 'light_long_sleeve', title: '얇은 긴팔·긴바지', section: '의류', unit: '벌', scope: 'personal',
        reason: '냉방이 강한 실내와 사원의 복장 규정에 대비해요',
      },
      { key: 'sandals', title: '샌들', section: '의류', unit: '켤레', scope: 'personal' },
      { ...umbrella, reason: '갑자기 쏟아지는 비가 잦아요' },
      { ...insectRepellent, reason: '뎅기열 같은 모기 매개 감염병을 예방해요' },
      {
        key: 'antidiarrheal', title: '지사제', section: '의약품', unit: '개', scope: 'shared',
        reason: '물과 음식이 바뀌면 배탈이 나기 쉬워요',
      },
      { key: 'wet_wipes', title: '물티슈·손소독제', section: '세면·위생', unit: '세트', scope: 'shared' },
    ],
    seasonalAdjustments: {
      summer: {
        add: [
          {
            key: 'waterproof_pouch', title: '휴대폰 방수팩', section: '전자기기', unit: '개', scope: 'personal',
            reason: '우기라 비가 자주 와요',
          },
          {
            key: 'spare_shoes', title: '여분 신발', section: '의류', unit: '켤레', scope: 'personal',
            reason: '젖은 신발이 잘 마르지 않아요',
          },
        ],
      },
    },
  },
  {
    id: 'temperate',
    name: '온대 · 사계절',
    baseItems: [walkingShoes, umbrella],
    seasonalAdjustments: {
      spring: { add: [lightJacket] },
      summer: {
        add: [
          { ...sunscreen, reason: '여름 햇볕이 강해요' },
          handheldFan,
          { key: 'handkerchief', title: '손수건·쿨토시', section: '의류', unit: '세트', scope: 'personal' },
        ],
      },
      autumn: { add: [lightJacket] },
      winter: { add: [winterCoat, glovesScarf, handWarmer, moisturizer] },
    },
  },
  {
    id: 'longhaul_varied',
    name: '장거리 · 다양한 기후',
    baseItems: [
      {
        key: 'neck_pillow', title: '목베개', section: '기타', unit: '개', scope: 'personal',
        reason: '10시간이 넘는 장거리 비행이에요',
      },
      { key: 'flight_clothes', title: '기내용 편한 옷', section: '의류', unit: '벌', scope: 'personal' },
      {
        key: 'layers', title: '겹쳐 입을 옷', section: '의류', unit: '벌', scope: 'personal',
        reason: '지역마다, 실내외마다 온도 차가 커요',
      },
      { ...moisturizer, reason: '기내와 건조한 지역에서 피부가 쉽게 건조해져요' },
      walkingShoes,
      sunscreen,
    ],
    seasonalAdjustments: {
      summer: { add: [{ key: 'sunglasses', title: '선글라스', section: '의류', unit: '개', scope: 'personal' }] },
      winter: { add: [winterCoat, glovesScarf] },
    },
  },
  {
    id: 'domestic',
    name: '국내 · 사계절',
    baseItems: [umbrella],
    seasonalAdjustments: {
      spring: {
        add: [
          lightJacket,
          {
            key: 'mask', title: '마스크', section: '세면·위생', unit: '개', scope: 'personal',
            reason: '봄에는 황사와 미세먼지가 잦아요',
          },
        ],
      },
      summer: {
        add: [
          { ...sunscreen, reason: '여름 햇볕이 강해요' },
          { ...insectRepellent, reason: '모기가 많은 계절이에요' },
          handheldFan,
        ],
      },
      autumn: { add: [lightJacket] },
      winter: { add: [{ ...winterCoat, title: '패딩·두꺼운 외투' }, glovesScarf, handWarmer] },
    },
  },
];

// 기존 여행 상황 템플릿(해외여행/국내여행/공항 출국/신혼여행) 항목명 → 공통 키
// 여행지 + 상황 조합 시 같은 물건이 두 번 들어가지 않게 병합하는 데 씀
export const TITLE_KEY_ALIASES: Record<string, string> = {
  '여권': 'passport',
  '여권+비자': 'passport',
  '항공권': 'flight_ticket',
  '항공권+숙소예약': 'flight_ticket',
  '항공권(모바일/인쇄)': 'flight_ticket',
  '여행자보험': 'travel_insurance',
  '여행자보험증서': 'travel_insurance',
  '해외용신용카드': 'overseas_card',
  '신용카드': 'overseas_card',
  '외화환전': 'local_cash',
  '외화': 'local_cash',
  '현금': 'local_cash',
  '해외용심카드': 'data_plan',
  '해외유심/이심': 'data_plan',
  '보조배터리': 'power_bank',
  '보조배터리(기내반입)': 'power_bank',
  '충전기': 'phone_charger',
  '충전기+보조배터리': 'power_bank',
  '액체류지퍼백(100ml이하)': 'liquids_bag',
  '세면용품': 'toiletries',
  '세면도구': 'toiletries',
  '상비약': 'basic_medicine',
  '비상연락처메모': 'emergency_contacts',
  '선크림': 'sunscreen',
  '목베개': 'neck_pillow',
  '멀티어댑터': 'travel_adapter',
  '여행용캐리어': 'suitcase',
  '여행가방': 'suitcase',
};
