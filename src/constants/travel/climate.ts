import { Destination, Season } from '../../types';

export interface ClimateNormal {
  cityName: string;
  normalsPeriod: string;
  monthly: { hi: number; lo: number }[];   // 1월~12월, 일 최고/최저 평균(°C)
  source: string;
  sourceUrl: string;
  verification: 'official' | 'secondary';  // secondary: 원출처를 인용한 2차 자료로 확인
}

export const CLIMATE_NORMALS: Record<string, ClimateNormal> = {
  tokyo: {
    cityName: '도쿄',
    normalsPeriod: '1991-2020',
    monthly: [
      { hi: 10, lo: 1 }, { hi: 11, lo: 2 }, { hi: 14, lo: 5 }, { hi: 19, lo: 10 },
      { hi: 24, lo: 15 }, { hi: 26, lo: 19 }, { hi: 30, lo: 22 }, { hi: 31, lo: 24 },
      { hi: 28, lo: 20 }, { hi: 22, lo: 15 }, { hi: 17, lo: 9 }, { hi: 12, lo: 4 },
    ],
    source: 'JMA 平年値(1991-2020) 東京 (47662)',
    sourceUrl: 'https://www.data.jma.go.jp/obd/stats/etrn/view/nml_sfc_ym.php?prec_no=44&block_no=47662',
    verification: 'official',
  },
  taipei: {
    cityName: '타이베이',
    normalsPeriod: '1991-2020',
    monthly: [
      { hi: 19, lo: 14 }, { hi: 20, lo: 14 }, { hi: 23, lo: 16 }, { hi: 26, lo: 19 },
      { hi: 30, lo: 23 }, { hi: 33, lo: 25 }, { hi: 35, lo: 27 }, { hi: 34, lo: 26 },
      { hi: 32, lo: 25 }, { hi: 28, lo: 22 }, { hi: 25, lo: 20 }, { hi: 21, lo: 16 },
    ],
    source: '대만 중앙기상서(CWA) 臺北 관측소 (466920) 1991-2020, Wikipedia 기후표 경유',
    sourceUrl: 'https://www.cwa.gov.tw/V8/C/C/Statistics/monthlymean.html',
    verification: 'secondary',
  },
  bangkok: {
    cityName: '방콕',
    normalsPeriod: '1991-2020',
    monthly: [
      { hi: 33, lo: 23 }, { hi: 34, lo: 25 }, { hi: 35, lo: 26 }, { hi: 36, lo: 27 },
      { hi: 35, lo: 27 }, { hi: 34, lo: 26 }, { hi: 34, lo: 26 }, { hi: 33, lo: 26 },
      { hi: 33, lo: 25 }, { hi: 33, lo: 25 }, { hi: 33, lo: 25 }, { hi: 32, lo: 23 },
    ],
    source: 'WMO 1991-2020 평년값(NOAA NCEI 보관), 태국 기상청 Bangkok Metropolis (48455)',
    sourceUrl: 'https://www.nodc.noaa.gov/archive/arc0216/0253808/1.1/data/0-data/Region-2-WMO-Normals-9120/Thailand/CSV/BangkokMetropolis_48455.csv',
    verification: 'official',
  },
  manila: {
    cityName: '마닐라',
    normalsPeriod: '1991-2020',
    monthly: [
      { hi: 30, lo: 24 }, { hi: 31, lo: 24 }, { hi: 32, lo: 25 }, { hi: 34, lo: 27 },
      { hi: 34, lo: 27 }, { hi: 33, lo: 27 }, { hi: 32, lo: 26 }, { hi: 31, lo: 26 },
      { hi: 31, lo: 26 }, { hi: 31, lo: 26 }, { hi: 31, lo: 25 }, { hi: 30, lo: 25 },
    ],
    source: 'PAGASA Climatological Normals (1991-2020), Port Area (MCO)',
    sourceUrl: 'https://pubfiles.pagasa.dost.gov.ph/pagasaweb/files/cad/CLIMATOLOGICAL%20NORMALS%20(1991-2020)/PORT%20AREA.pdf',
    verification: 'official',
  },
  seoul: {
    cityName: '서울',
    normalsPeriod: '1991-2020',
    monthly: [
      { hi: 2, lo: -6 }, { hi: 5, lo: -3 }, { hi: 11, lo: 2 }, { hi: 18, lo: 8 },
      { hi: 24, lo: 14 }, { hi: 28, lo: 19 }, { hi: 29, lo: 22 }, { hi: 30, lo: 23 },
      { hi: 26, lo: 18 }, { hi: 20, lo: 11 }, { hi: 12, lo: 4 }, { hi: 4, lo: -3 },
    ],
    source: '기상청(KMA) 기후평년값 1991-2020, 서울 (108), Wikipedia 기후표 경유',
    sourceUrl: 'https://data.kma.go.kr/resources/normals/pdf_data/korea_pdf_0106_v2.pdf',
    verification: 'secondary',
  },
};

export interface ClimateSummary {
  label: string;
  cityName?: string;
  month?: number;
  hi?: number;
  lo?: number;
}

// 대표 도시가 있는 여행지만 기온 숫자를 주고, 없으면 계절 라벨만 준다
export const getClimateSummary = (destination: Destination, season: Season, month: number): ClimateSummary => {
  const label = destination.climateLabel[season];
  const normal = destination.climateCityId ? CLIMATE_NORMALS[destination.climateCityId] : undefined;
  if (!normal) return { label };
  const { hi, lo } = normal.monthly[month - 1];
  return { label, cityName: normal.cityName, month, hi, lo };
};
