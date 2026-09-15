import { Destination } from '../../types';

// 국가 예외값은 대한민국 일반여권·관광·단기 방문 기준.
// entryItems: 출국 전에 직접 해야 하는 일만 (반입 금지 같은 안내는 cautions).
// 공식 원문으로 확인하지 못한 값은 unverified에 적고, 규정이 불확실한 숫자(체류일수·수수료)는 넣지 않는다.
// lastVerifiedAt이 비어 있으면 미검증 상태이며 테스트에서 실패 처리된다.
export const DESTINATIONS: Destination[] = [
  {
    kind: 'destination',
    id: 'japan',
    name: '일본',
    aliases: ['japan', '도쿄', '오사카', '교토', '후쿠오카', '삿포로', '오키나와', '나고야'],
    domestic: false,
    climatePresetId: 'temperate',
    climateCityId: 'tokyo',
    climateLabel: {
      spring: '선선하고 일교차가 있어요',
      summer: '덥고 습해요 · 장마와 태풍',
      autumn: '9월은 아직 덥고 태풍, 10월부터 선선해요',
      winter: '춥고 건조해요',
    },
    countryExceptions: {
      power: { voltage: '100V', plugTypes: ['A', 'B'], needsAdapter: true, note: '220V 전용 헤어드라이어·고데기는 쓸 수 없어요' },
      entryItems: [
        {
          key: 'visit_japan_web', title: 'Visit Japan Web 등록 (선택)', section: '서류', unit: '건', scope: 'personal',
          reason: '미리 등록하면 입국심사·세관신고를 QR로 할 수 있어요. 종이 신고서도 쓸 수 있어요',
        },
      ],
      connectivityItems: [],
      cautions: [
        '육포·소시지 같은 육류 가공품은 허가 없이 가져갈 수 없어요',
        '슈도에페드린 성분이 든 감기약·코감기약은 반입이 금지돼요',
        '모르는 사람이 맡긴 짐은 절대 대신 운반하지 마세요',
      ],
      lastVerifiedAt: '2026-09-15',
      sourceUrls: [
        'https://0404.go.kr/ntnSafetyInfo/183/detail',
        'https://www.japan.travel/en/plan/plug-and-electricity/',
        'https://www.maff.go.jp/aqs/english/product/import.html',
        'https://services.digital.go.jp/en/visit-japan-web/',
      ],
      unverified: [
        '감기약 슈도에페드린 반입 기준 (후생노동성 원문 확인 필요)',
        'Visit Japan Web 선택 여부 (2차 출처)',
      ],
    },
  },
  {
    kind: 'destination',
    id: 'vietnam',
    name: '베트남',
    aliases: ['vietnam', '다낭', '하노이', '호치민', '호찌민', '나트랑', '푸꾸옥', '사파'],
    domestic: false,
    climatePresetId: 'tropical_humid',
    climateLabel: {
      spring: '지역마다 달라요 · 북부는 따뜻, 남부는 덥고 건조',
      summer: '지역마다 달라요 · 대체로 덥고 습한 우기',
      autumn: '지역마다 달라요 · 중부는 우기와 태풍',
      winter: '지역마다 달라요 · 북부는 쌀쌀, 남부는 건기',
    },
    extraItems: [
      {
        key: 'light_jacket', title: '가벼운 겉옷', section: '의류', unit: '벌', scope: 'personal', seasons: ['winter'],
        reason: '북부(하노이·사파)는 겨울에 쌀쌀해요',
      },
    ],
    countryExceptions: {
      power: { voltage: '220V', plugTypes: ['A', 'C', 'F'], needsAdapter: false, note: '한국 플러그가 대부분 맞지만 숙소마다 다른 타입 콘센트도 섞여 있어요' },
      entryItems: [],
      connectivityItems: [],
      cautions: [
        '전자담배·가열담배는 반입과 사용이 금지돼요. 적발되면 벌금과 함께 기기를 폐기해요',
        '45일 넘게 머물면 전자비자가 필요해요',
        '관광지 소매치기와 여권 분실이 잦아요. 여권 사본을 따로 챙겨요',
      ],
      lastVerifiedAt: '2026-09-15',
      sourceUrls: [
        'https://en.baochinhphu.vn/viet-nam-waives-visas-for-citizens-from-12-countries-until-march-2028-111250308085955058.htm',
        'https://vn.mofa.go.kr/vn-ko/brd/m_27022/view.do?seq=1339303',
        'https://0404.go.kr/bbs/safetyNtc/ATC0000000048211/detail',
      ],
      unverified: ['플러그 타입 (2차 출처)'],
    },
  },
  {
    kind: 'destination',
    id: 'thailand',
    name: '태국',
    aliases: ['thailand', '방콕', '푸껫', '푸켓', '치앙마이', '파타야', '끄라비', '코사무이'],
    domestic: false,
    climatePresetId: 'tropical_humid',
    climateCityId: 'bangkok',
    climateLabel: {
      spring: '일 년 중 가장 더워요',
      summer: '덥고 습해요 · 우기',
      autumn: '9~10월은 비가 가장 많고, 11월부터 건기예요',
      winter: '건기 · 비교적 선선해요',
    },
    countryExceptions: {
      power: { voltage: '220V', plugTypes: ['A', 'B', 'C', 'F', 'O'], needsAdapter: false, note: '한국 플러그가 대부분 맞지만 다른 타입 콘센트도 섞여 있어요' },
      entryItems: [
        {
          key: 'thailand_tdac', title: '태국 디지털 입국카드(TDAC) 작성', section: '서류', unit: '건', scope: 'personal',
          reason: '모든 외국인이 도착 3일 전부터 온라인으로 작성해야 해요. 무료예요',
        },
      ],
      connectivityItems: [],
      cautions: [
        '2026년 9월 태국 무비자 제도가 바뀌었어요. 머물 수 있는 기간은 출국 전 외교부 해외안전여행에서 확인해요',
        '전자담배는 반입과 사용이 금지돼요',
        '대마 성분 제품은 가져오거나 가져가지 마세요',
      ],
      lastVerifiedAt: '2026-09-15',
      sourceUrls: [
        'https://0404.go.kr/ntnSafetyInfo/260/detail',
        'https://tdac.immigration.go.th',
        'https://www.tatnews.org/2026/09/thailand-introduces-new-30-day-and-15-day-visa-exemption-rules-from-15-september/',
      ],
      unverified: ['한국인 무비자 체류일수 (9/15 개편 후 태국 측 명시 미확인)', '플러그 타입 (2차 출처)'],
    },
  },
  {
    kind: 'destination',
    id: 'taiwan',
    name: '대만',
    aliases: ['taiwan', '타이베이', '타이페이', '가오슝', '타이중', '타이난', '지우펀'],
    domestic: false,
    climatePresetId: 'temperate',
    seasonPresetOverride: { summer: 'tropical_humid' },
    climateCityId: 'taipei',
    climateLabel: {
      spring: '따뜻하고 비가 잦아요',
      summer: '덥고 습해요 · 태풍',
      autumn: '초가을은 덥고 태풍, 늦가을은 따뜻해요',
      winter: '선선하고 흐린 날이 많아요',
    },
    countryExceptions: {
      power: { voltage: '110V', plugTypes: ['A', 'B'], needsAdapter: true, note: '220V 전용 헤어드라이어·고데기는 쓸 수 없어요' },
      entryItems: [
        {
          key: 'taiwan_twac', title: '대만 온라인 입국신고서(TWAC) 제출', section: '서류', unit: '건', scope: 'personal',
          reason: '2025년 10월부터 종이 신고서가 없어졌어요. 도착 3일 전부터 온라인으로 내요',
        },
        {
          key: 'return_ticket', title: '귀국 항공권 예약 확인', section: '서류', unit: '건', scope: 'personal',
          reason: '무비자로 들어갈 때 확정된 귀국·다음 목적지 항공권이 필요해요',
        },
      ],
      connectivityItems: [],
      cautions: [
        '육포·소시지 같은 육류 가공품은 반입 금지예요. 돼지고기 제품은 적발되면 큰 벌금이 부과돼요',
        '전자담배는 반입과 사용이 처벌 대상이에요',
        '모르는 사람이 맡긴 짐은 절대 대신 운반하지 마세요',
      ],
      lastVerifiedAt: '2026-09-15',
      sourceUrls: [
        'https://www.boca.gov.tw/cp-149-4486-7785a-2.html',
        'https://www.immigration.gov.tw/5475/5478/141457/142068/398041/',
        'https://web.customs.gov.tw/etaipei/singlehtml/1367?cntId=df67c73ce2f449f09c487bf7f3ed88bb',
        'https://0404.go.kr/ntnSafetyInfo/372/detail',
      ],
      unverified: ['TWAC 제출 시작 시점 (이민서 3일 전 / 영사국 7일 이내로 출처마다 다름)', '플러그 타입 (2차 출처)'],
    },
  },
  {
    kind: 'destination',
    id: 'philippines',
    name: '필리핀',
    aliases: ['philippines', '세부', '보라카이', '마닐라', '보홀', '팔라완', '엘니도'],
    domestic: false,
    climatePresetId: 'tropical_humid',
    climateCityId: 'manila',
    climateLabel: {
      spring: '건기 · 더워요',
      summer: '우기 · 태풍',
      autumn: '우기 · 태풍',
      winter: '건기 · 비교적 선선해요',
    },
    countryExceptions: {
      power: { voltage: '220V', plugTypes: ['A', 'B', 'C'], needsAdapter: true, note: 'A타입 콘센트만 있는 곳이 많아요' },
      entryItems: [
        {
          key: 'philippines_etravel', title: '필리핀 eTravel 등록', section: '서류', unit: '건', scope: 'personal',
          reason: '도착 72시간 이내에 공식 사이트에서 무료로 등록해요. 돈을 받는 사칭 사이트를 조심해요',
        },
        {
          key: 'return_ticket', title: '귀국 항공권 예약 확인', section: '서류', unit: '건', scope: 'personal',
          reason: '무비자 입국 시 왕복 또는 다음 목적지 항공권이 필요해요',
        },
      ],
      connectivityItems: [],
      cautions: [
        '여권은 머무는 기간에 6개월 이상 남아 있어야 해요',
        '5만 페소 또는 미화 1만 달러가 넘는 현금은 신고해야 해요',
        '오토바이 날치기, 가짜 경찰 사기를 조심해요',
      ],
      lastVerifiedAt: '2026-09-15',
      sourceUrls: [
        'https://www.philembassy-seoul.com/visa',
        'https://immigration.gov.ph/etravel-registration-free-of-charge/',
        'https://0404.go.kr/ntnSafetyInfo/252/detail',
      ],
      unverified: ['플러그 타입 (2차 출처)'],
    },
  },
  {
    kind: 'destination',
    id: 'usa',
    name: '미국',
    aliases: ['usa', 'america', '미주', '뉴욕', '로스앤젤레스', 'la', '샌프란시스코', '라스베이거스', '하와이', '시애틀'],
    domestic: false,
    climatePresetId: 'longhaul_varied',
    climateLabel: {
      spring: '지역마다 크게 달라요 · 일교차가 커요',
      summer: '지역마다 크게 달라요 · 대체로 더워요',
      autumn: '지역마다 크게 달라요 · 선선해요',
      winter: '지역마다 크게 달라요 · 북부는 매우 추워요',
    },
    countryExceptions: {
      power: { voltage: '120V', plugTypes: ['A', 'B'], needsAdapter: true, note: '220V 전용 헤어드라이어·고데기는 쓸 수 없어요' },
      entryItems: [
        {
          key: 'usa_esta', title: '미국 ESTA 승인 확인', section: '서류', unit: '건', scope: 'personal',
          reason: '승인이 없으면 비행기를 탈 수 없어요. 출발 72시간 전까지 신청하는 게 안전해요',
        },
      ],
      connectivityItems: [],
      cautions: [
        '육류·생과일·씨앗 같은 농축산물은 입국 때 반드시 신고해요. 신고하지 않으면 벌금이 부과돼요',
        '입국심사에서 휴대폰이나 짐을 검사할 수 있어요',
      ],
      lastVerifiedAt: '2026-09-15',
      sourceUrls: [
        'https://0404.go.kr/ntnSafetyInfo/69/detail',
        'https://esta.cbp.dhs.gov/faq',
        'https://www.cbp.gov/travel/international-visitors/agricultural-items',
      ],
      unverified: ['ESTA 수수료 (원문 미확인이라 앱에 금액 표시 안 함)', '전압·플러그 (2차 출처)'],
    },
  },
  {
    kind: 'destination',
    id: 'europe',
    name: '유럽',
    aliases: ['europe', '파리', '프랑스', '런던', '영국', '로마', '이탈리아', '바르셀로나', '스페인', '스위스', '프라하', '독일'],
    domestic: false,
    climatePresetId: 'temperate',
    climateLabel: {
      spring: '나라마다 달라요 · 선선하고 일교차가 커요',
      summer: '나라마다 달라요 · 대체로 따뜻, 남부는 더워요',
      autumn: '나라마다 달라요 · 선선하고 비가 잦아요',
      winter: '나라마다 달라요 · 춥고 해가 짧아요, 남부는 비교적 온화',
    },
    extraItems: [
      {
        key: 'neck_pillow', title: '목베개', section: '기타', unit: '개', scope: 'personal',
        reason: '10시간이 넘는 장거리 비행이에요',
      },
      {
        key: 'anti_theft_bag', title: '도난방지 가방·목걸이 지갑', section: '기타', unit: '개', scope: 'personal',
        reason: '관광지와 지하철 소매치기 피해가 많아요',
      },
    ],
    countryExceptions: {
      power: {
        voltage: '230V',
        plugTypes: ['C', 'E', 'F'],
        needsAdapter: false,
        note: '대부분 한국 플러그가 맞지만 영국(G)·스위스(J)·이탈리아(L)·덴마크(K)는 어댑터가 필요해요',
      },
      entryItems: [
        {
          key: 'uk_eta', title: '영국에 간다면 ETA 신청', section: '서류', unit: '건', scope: 'personal',
          reason: '영국은 쉥겐 국가와 달리 전자여행허가(ETA)가 필요해요. 아기도 1인당 1건이에요',
        },
      ],
      connectivityItems: [],
      cautions: [
        '쉥겐 국가 여권은 출국 예정일로부터 3개월 이상 남고, 발급 10년 이내여야 해요',
        '2026년 4월부터 첫 입국 때 얼굴·지문을 등록하는 EES가 시행돼 줄이 길 수 있어요',
        '유럽 여행허가(ETIAS)는 2026년 9월 기준 아직 시행 전이에요',
        '지하철 문이 닫힐 때 날치기, 지갑 검사를 요구하는 가짜 경찰을 조심해요',
      ],
      lastVerifiedAt: '2026-09-15',
      sourceUrls: [
        'https://europa.eu/youreurope/citizens/travel/entry-exit/non-eu-nationals/index_en.htm',
        'https://home-affairs.ec.europa.eu/news/entryexit-system-ees-fully-operational-2026-04-10_en',
        'https://www.gov.uk/guidance/apply-for-an-electronic-travel-authorisation-eta',
        'https://0404.go.kr/ntnSafetyInfo/248/detail',
        'https://0404.go.kr/ntnSafetyInfo/159/detail',
        'https://overseas.mofa.go.kr/fr-ko/brd/m_9450/view.do?seq=1345604',
      ],
      unverified: ['ETIAS 시행일 (연기 유력, 날짜 미정)', '나라별 플러그 타입 (2차 출처)'],
    },
  },
  {
    kind: 'destination',
    id: 'korea',
    name: '국내',
    aliases: ['대한민국', '한국', '제주', '부산', '강릉', '경주', '여수', '속초', '전주'],
    domestic: true,
    climatePresetId: 'domestic',
    climateCityId: 'seoul',
    climateLabel: {
      spring: '따뜻하고 일교차가 커요 · 황사와 미세먼지',
      summer: '덥고 습해요 · 장마',
      autumn: '선선하고 맑아요',
      winter: '춥고 건조해요',
    },
    countryExceptions: {
      power: null,
      entryItems: [],
      connectivityItems: [],
      cautions: [],
      lastVerifiedAt: '',
      sourceUrls: [],
    },
  },
];

export const getDestination = (id: string): Destination | undefined =>
  DESTINATIONS.find(destination => destination.id === id);
