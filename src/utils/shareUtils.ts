import { Share, Alert } from 'react-native';
import { Checklist } from '../types';

export const PLAY_STORE_LINK = 'https://play.google.com/store/apps/details?id=com.checklist.amajdaigeo';

export interface SharedChecklistData {
  id: string;
  title: string;
  description?: string;
  items: {
    title: string;
    description?: string;
    quantity?: number;
    unit?: string;
    order: number;
  }[];
  sharedAt: string;
  sharedBy: string;
  originalId: string;
}

export const createShareableData = (checklist: Checklist): SharedChecklistData => {
  return {
    id: `shared_${Date.now()}`,
    title: checklist.title,
    description: checklist.description,
    items: checklist.items.map(item => ({
      title: item.title,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      order: item.order,
    })),
    sharedAt: new Date().toISOString(),
    sharedBy: '아맞다이거! 사용자',
    originalId: checklist.id,
  };
};

const encodeChecklistData = (data: SharedChecklistData): string => {
  const json = JSON.stringify(data);
  try {
    const utf8Bytes = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    return btoa(utf8Bytes);
  } catch {
    return encodeURIComponent(json);
  }
};

const decodeChecklistData = (encoded: string): string => {
  try {
    const utf8Bytes = atob(encoded);
    return decodeURIComponent(
      utf8Bytes.split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    );
  } catch {
    return decodeURIComponent(encoded);
  }
};

/**
 * 형식 1: 앱으로 보내기 (Primary)
 * 짧은 소개 + Play Store 링크 + 임베디드 데이터
 */
export const generateAppShareText = (checklist: Checklist): string => {
  const data = createShareableData(checklist);
  const encodedData = encodeChecklistData(data);
  const totalItems = checklist.items.length;

  if (totalItems === 0) {
    return `[아맞다이거!] ${checklist.title}

항목 없음

앱에서 바로 가져오기:
1. 아맞다이거! 설치 → ${PLAY_STORE_LINK}
2. 홈 화면 📥 버튼 → 이 메시지 전체 붙여넣기

#CHECKLIST_DATA#${encodedData}#END#`;
  }

  // Don't mutate original array — use spread to copy before sorting
  const previewItems = [...checklist.items]
    .sort((a, b) => a.order - b.order)
    .slice(0, 3)
    .map(item => item.title)
    .join(', ');
  const remainingCount = totalItems - 3;
  const itemsSummary = remainingCount > 0
    ? `${previewItems} 외 ${remainingCount}개 항목`
    : previewItems;

  return `[아맞다이거!] ${checklist.title}

${itemsSummary}

앱에서 바로 가져오기:
1. 아맞다이거! 설치 → ${PLAY_STORE_LINK}
2. 홈 화면 📥 버튼 → 이 메시지 전체 붙여넣기

#CHECKLIST_DATA#${encodedData}#END#`;
};

/**
 * 형식 2: 텍스트만 보내기
 * 체크리스트 목록 텍스트 + Play Store 링크
 */
export const generateTextShareText = (checklist: Checklist): string => {
  const sortedItems = [...checklist.items].sort((a, b) => a.order - b.order);

  if (sortedItems.length === 0) {
    return `[아맞다이거!] ${checklist.title}

(항목 없음)

아맞다이거! 다운로드 → ${PLAY_STORE_LINK}`;
  }

  const maxDisplay = 10;
  const displayItems = sortedItems.slice(0, maxDisplay);
  const remainingCount = sortedItems.length - maxDisplay;

  const itemsList = displayItems.map(item => {
    const quantity = item.quantity && item.quantity > 1
      ? ` (${item.quantity}${item.unit || '개'})`
      : '';
    return `☐ ${item.title}${quantity}`;
  }).join('\n');

  const moreText = remainingCount > 0 ? `\n... 외 ${remainingCount}개\n` : '';

  return `[아맞다이거!] ${checklist.title}

${itemsList}${moreText}

아맞다이거! 다운로드 → ${PLAY_STORE_LINK}`;
};

export const shareChecklist = async (checklist: Checklist, format: 'app' | 'text' = 'app'): Promise<boolean> => {
  try {
    const shareText = format === 'app'
      ? generateAppShareText(checklist)
      : generateTextShareText(checklist);

    const result = await Share.share({
      message: shareText,
      title: `[아맞다이거!] ${checklist.title}`,
    }, {
      subject: `[아맞다이거!] ${checklist.title}`,
      dialogTitle: '체크리스트 공유하기',
    });

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Share error:', error);
    Alert.alert(
      '공유 실패',
      '체크리스트 공유에 실패했습니다. 다시 시도해 주세요.',
      [{ text: '확인' }]
    );
    return false;
  }
};

const MAX_SHARED_DATA_LENGTH = 500_000;
const MAX_DECODED_DATA_LENGTH = 200_000;
const MAX_ITEMS_COUNT = 500;
const MAX_STRING_FIELD_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_QUANTITY = 9999;

export const parseSharedChecklist = (sharedData: string): SharedChecklistData | null => {
  try {
    if (sharedData.length > MAX_SHARED_DATA_LENGTH) {
      console.warn('Shared data exceeds size limit');
      return null;
    }

    // 1. #CHECKLIST_DATA#...#END# 마커 형식
    // Fast pre-check before regex
    if (sharedData.includes('#CHECKLIST_DATA#')) {
      const markerMatch = sharedData.match(/#CHECKLIST_DATA#(.+?)#END#/s);
      if (markerMatch) {
        // Strip whitespace that may have been inserted by message wrapping
        const cleanEncoded = markerMatch[1].replace(/\s/g, '');
        const decoded = decodeChecklistData(cleanEncoded);
        if (decoded.length > MAX_DECODED_DATA_LENGTH) {
          console.warn('Decoded data exceeds size limit');
          return null;
        }
        const parsed = JSON.parse(decoded);
        if (validateSharedChecklistData(parsed)) {
          return parsed as SharedChecklistData;
        }
      }
    }

    // 2. amajdaigeo:// 딥링크 형식
    if (sharedData.startsWith('amajdaigeo://import-checklist?data=')) {
      const encodedData = sharedData.slice('amajdaigeo://import-checklist?data='.length);
      const decodedData = decodeURIComponent(encodedData);
      if (decodedData.length > MAX_DECODED_DATA_LENGTH) {
        console.warn('Decoded deep link data exceeds size limit');
        return null;
      }
      const parsed = JSON.parse(decodedData);
      if (validateSharedChecklistData(parsed)) {
        return parsed as SharedChecklistData;
      }
      return null;
    }

    // 3. 직접 JSON 문자열인 경우
    const parsed = JSON.parse(sharedData);
    if (validateSharedChecklistData(parsed)) {
      return parsed as SharedChecklistData;
    }

    return null;
  } catch (error) {
    console.error('Parse shared checklist error:', error);
    return null;
  }
};

export const validateSharedChecklistData = (data: any): data is SharedChecklistData => {
  return (
    data &&
    typeof data.id === 'string' && data.id.length <= MAX_STRING_FIELD_LENGTH &&
    typeof data.title === 'string' && data.title.length > 0 && data.title.length <= MAX_STRING_FIELD_LENGTH &&
    (data.description === undefined || (typeof data.description === 'string' && data.description.length <= MAX_DESCRIPTION_LENGTH)) &&
    Array.isArray(data.items) &&
    data.items.length <= MAX_ITEMS_COUNT &&
    data.items.every((item: any) =>
      typeof item.title === 'string' && item.title.length > 0 && item.title.length <= MAX_STRING_FIELD_LENGTH &&
      typeof item.order === 'number' && Number.isFinite(item.order) &&
      (item.description === undefined || (typeof item.description === 'string' && item.description.length <= MAX_DESCRIPTION_LENGTH)) &&
      (item.quantity === undefined || (typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity >= 0 && item.quantity <= MAX_QUANTITY)) &&
      (item.unit === undefined || (typeof item.unit === 'string' && item.unit.length <= 20))
    ) &&
    typeof data.sharedAt === 'string' && data.sharedAt.length <= 50 &&
    typeof data.sharedBy === 'string' && data.sharedBy.length <= MAX_STRING_FIELD_LENGTH &&
    typeof data.originalId === 'string' && data.originalId.length <= MAX_STRING_FIELD_LENGTH
  );
};
