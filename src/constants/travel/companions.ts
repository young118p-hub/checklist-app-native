import { CompanionType, TemplateItem } from '../../types';

export const COMPANION_LABELS: Record<CompanionType, string> = {
  baby: '아기 동반',
  kid: '어린이 동반',
  senior: '어르신 동반',
  pet: '반려동물 동반',
};

// 반려동물은 해외 검역 절차가 나라마다 달라서 국내 여행에서만 지원
export const DOMESTIC_ONLY_COMPANIONS: CompanionType[] = ['pet'];

// 인원 수(peopleCount)는 아기·어린이를 포함한 전체 인원 기준.
// 동행자 항목은 인원을 곱하지 않도록 scope를 shared로 둔다.
export const COMPANION_ITEMS: Record<CompanionType, TemplateItem[]> = {
  baby: [
    {
      key: 'diapers', title: '기저귀', section: '아기', perDay: 8, baseQuantity: 10, unit: '개', scope: 'shared',
      reason: '하루 8개 기준으로 계산했어요. 월령에 맞게 조절해요',
    },
    {
      key: 'baby_formula', title: '분유·이유식', section: '아기', unit: '세트', scope: 'shared',
      reason: '여행지에서 먹던 제품을 구하기 어려울 수 있어요',
    },
    { key: 'bottles', title: '젖병·세척솔', section: '아기', unit: '세트', scope: 'shared' },
    { key: 'baby_wipes', title: '아기 물티슈', section: '아기', perDay: 1, maxQuantity: 7, baseQuantity: 2, unit: '팩', scope: 'shared' },
    { key: 'baby_clothes', title: '아기 여벌옷', section: '아기', perDay: 2, maxQuantity: 10, baseQuantity: 3, unit: '벌', scope: 'shared' },
    { key: 'stroller', title: '휴대용 유모차', section: '아기', unit: '대', scope: 'shared' },
    {
      key: 'baby_medicine', title: '아기 해열제·체온계', section: '의약품', unit: '세트', scope: 'shared',
      reason: '밤에 열이 날 때 바로 쓸 수 있게 챙겨요',
    },
  ],
  kid: [
    { key: 'kid_clothes', title: '아이 여벌옷', section: '어린이', perDay: 1, maxQuantity: 5, baseQuantity: 2, unit: '벌', scope: 'shared' },
    {
      key: 'kid_snacks', title: '간식', section: '어린이', unit: '세트', scope: 'shared',
      reason: '이동 시간이 길면 아이가 금방 지루해해요',
    },
    { key: 'kid_entertainment', title: '태블릿·어린이용 이어폰', section: '어린이', unit: '세트', scope: 'shared' },
    { key: 'kid_medicine', title: '어린이 해열제', section: '의약품', unit: '개', scope: 'shared' },
  ],
  senior: [
    {
      key: 'prescription_meds', title: '복용 중인 약', section: '의약품', unit: '세트', scope: 'shared',
      reason: '여행 일수보다 며칠 넉넉히 챙겨요',
    },
    {
      key: 'warm_layer', title: '보온용 겉옷', section: '어르신', unit: '벌', scope: 'shared',
      reason: '냉방이 강한 차량과 실내에서 체온을 지켜요',
    },
    { key: 'seat_cushion', title: '휴대용 방석', section: '어르신', unit: '개', scope: 'shared' },
  ],
  pet: [
    { key: 'pet_food', title: '사료·간식', section: '반려동물', perDay: 1, baseQuantity: 2, unit: '일분', scope: 'shared' },
    { key: 'pet_pads', title: '배변패드', section: '반려동물', perDay: 3, baseQuantity: 5, unit: '장', scope: 'shared' },
    { key: 'poop_bags', title: '배변봉투', section: '반려동물', perDay: 5, baseQuantity: 10, unit: '개', scope: 'shared' },
    {
      key: 'leash', title: '목줄·하네스', section: '반려동물', unit: '개', scope: 'shared',
      reason: '공공장소에서는 목줄을 해야 해요',
    },
    { key: 'pet_bowls', title: '휴대용 물·밥그릇', section: '반려동물', unit: '세트', scope: 'shared' },
    {
      key: 'pet_records', title: '동물등록증·예방접종 기록', section: '서류', unit: '건', scope: 'shared',
      reason: '반려동물 동반 숙소나 시설에서 요구할 수 있어요',
    },
    { key: 'pet_friendly_stay', title: '반려동물 동반 숙소 확인', section: '서류', unit: '건', scope: 'shared' },
  ],
};
