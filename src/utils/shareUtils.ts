import { Share, Platform, Alert } from 'react-native';
import { Checklist } from '../types';

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

export const shareChecklist = async (checklist: Checklist): Promise<boolean> => {
  try {
    // Create shareable data (excluding sensitive info)
    const shareableData: SharedChecklistData = {
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

    // Create shareable text
    const shareText = createShareText(shareableData);
    const shareData = createShareData(shareableData);

    const result = await Share.share({
      message: shareText,
      title: `📝 ${checklist.title} - 아맞다이거! 체크리스트`,
      url: Platform.OS === 'ios' ? shareData : undefined,
    }, {
      subject: `📝 ${checklist.title} - 체크리스트 공유`,
      dialogTitle: '체크리스트 공유하기',
      excludedActivityTypes: Platform.OS === 'ios' ? [
        'com.apple.UIKit.activity.PostToWeibo',
        'com.apple.UIKit.activity.Print',
      ] : undefined,
    });

    if (result.action === Share.sharedAction) {
      return true;
    }
    
    return false;
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

const createShareText = (data: SharedChecklistData): string => {
  const itemsText = data.items
    .sort((a, b) => a.order - b.order)
    .map(item => {
      const quantity = item.quantity && item.quantity > 1 ? 
        ` (${item.quantity}${item.unit || '개'})` : '';
      const description = item.description ? ` - ${item.description}` : '';
      return `• ${item.title}${quantity}${description}`;
    })
    .join('\n');

  return `📝 ${data.title}

${data.description || ''}

준비물 목록:
${itemsText}

---
🎯 아맞다이거! 앱에서 생성된 체크리스트
📱 앱 다운로드: [앱스토어/구글플레이 링크]

공유된 시간: ${new Date(data.sharedAt).toLocaleDateString('ko-KR')}`;
};

const createShareData = (data: SharedChecklistData): string => {
  // JSON 형태로 데이터를 인코딩하여 URL처럼 만들기
  const encodedData = encodeURIComponent(JSON.stringify(data));
  return `amajdaigeo://import-checklist?data=${encodedData}`;
};

export const parseSharedChecklist = (sharedData: string): SharedChecklistData | null => {
  try {
    // URL 형태의 데이터에서 파싱
    if (sharedData.startsWith('amajdaigeo://import-checklist?data=')) {
      const encodedData = sharedData.replace('amajdaigeo://import-checklist?data=', '');
      const decodedData = decodeURIComponent(encodedData);
      return JSON.parse(decodedData) as SharedChecklistData;
    }

    // 직접 JSON 문자열인 경우
    const parsed = JSON.parse(sharedData);
    if (parsed.id && parsed.title && parsed.items && Array.isArray(parsed.items)) {
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
    typeof data.id === 'string' &&
    typeof data.title === 'string' &&
    Array.isArray(data.items) &&
    data.items.every((item: any) => 
      typeof item.title === 'string' &&
      typeof item.order === 'number'
    ) &&
    typeof data.sharedAt === 'string' &&
    typeof data.originalId === 'string'
  );
};