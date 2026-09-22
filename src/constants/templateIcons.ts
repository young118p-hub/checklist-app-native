import { IconName } from '../components/ui/Icon';
import { SituationTemplate } from '../types';

const BY_ID: Record<string, IconName> = {
  camping: 'tent', glamping: 'tent', car_camping: 'car', road_trip: 'car', car_wash: 'car', drivers_license_test: 'car',
  overseas_travel: 'globe', honeymoon_trip: 'plane', airport_departure: 'plane', travel: 'plane', study_abroad_prep: 'globe',
  hospital_admission: 'hospital', child_hospital_visit: 'hospital', elderly_care: 'hospital', hospital_visit: 'hospital',
  business_trip: 'briefcase', job_interview: 'briefcase', morning_work: 'briefcase', remote_work: 'laptop',
  moving: 'box', first_living_alone: 'key', apartment_viewing: 'key', home_maintenance: 'wrench',
  gym_prep: 'dumbbell', yoga_pilates: 'dumbbell', korean_hiking: 'mountain', mountain_hiking: 'mountain',
  ski_snowboard: 'snow', winter_activity: 'snow',
  beach_trip: 'waves', waterpark: 'waves', fishing: 'fish',
  newborn_prep: 'baby', daycare_prep: 'baby',
  pet_walk: 'paw', pet_hospital: 'paw',
  dormitory_prep: 'book', exam_prep: 'book', korean_study_cafe: 'book', graduation_ceremony: 'graduation',
  date_prep: 'heart', han_river_date: 'heart', amusement_park_date: 'ticket', movie_date: 'ticket',
  cherry_blossom_date: 'flower', korean_wedding: 'heart', festival_concert: 'music', summer_festival: 'music',
  picnic: 'basket', korean_bbq: 'flame', christmas_party: 'gift', birthday_party: 'gift',
  korean_sauna: 'steam', chuseok_prep: 'bowl', seollal_homecoming: 'bowl', funeral_visit: 'flower',
  military_enlistment: 'shield',
};

const BY_CATEGORY: Record<string, IconName> = {
  여행: 'plane', 아웃도어: 'tent', 업무: 'briefcase', 생활: 'home', 공부: 'book', 여가: 'music', 운동: 'dumbbell', 일상: 'sun',
};

export const getTemplateIcon = (template?: Pick<SituationTemplate, 'id' | 'category'> | null): IconName =>
  (template && (BY_ID[template.id] ?? BY_CATEGORY[template.category])) || 'list';

export const getCategoryIcon = (categoryId?: string): IconName =>
  (categoryId && BY_CATEGORY[categoryId]) || 'list';

const SHORT_NAMES: Record<string, string> = {
  travel: '국내여행',
  car_camping: '차박',
};

// 타일에 들어갈 짧은 이름: '출장 준비' → '출장', '산 등반 (고난도)' → '산 등반'
export const getShortName = (template: Pick<SituationTemplate, 'id' | 'name'>): string =>
  SHORT_NAMES[template.id] ?? template.name.replace(/\s*\(.*\)\s*$/, '').replace(/\s*준비$/, '').trim();

// 홈에 먼저 보여줄 상황 6개 (시안 순서)
export const HOME_TEMPLATE_IDS = ['camping', 'car_camping', 'overseas_travel', 'hospital_admission', 'business_trip', 'moving'];

// 템플릿 분류 칩 순서. 데이터에 없는 분류는 자동으로 빠진다.
export const CATEGORY_ORDER = ['여행', '아웃도어', '생활', '여가', '운동', '업무', '공부', '일상'];
