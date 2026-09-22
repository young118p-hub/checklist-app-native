/// <reference types="jest" />
import { generateAppShareText, parseSharedChecklist, sharedToChecklistData, validateSharedChecklistData } from '../shareUtils';
import { Checklist } from '../../types';

const checklist: Checklist = {
  id: 'c1',
  title: '일본 여행',
  isTemplate: false,
  isPublic: false,
  peopleCount: 2,
  userId: 'local-user',
  categoryId: '여행',
  source: { kind: 'destination', destinationId: 'japan', startDate: '2026-10-01', endDate: '2026-10-05', peopleCount: 2, engineVersion: 1 },
  cautions: ['육류 가공품은 반입할 수 없어요'],
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'local-user', email: '' },
  items: [
    {
      id: 'i1', checklistId: 'c1', title: '보조배터리', quantity: 1, unit: '개', isCompleted: true, order: 0,
      section: '전자기기', scope: 'shared', reason: '위탁 수하물에 넣을 수 없어요', baggage: 'carry_on',
      createdAt: new Date(), updatedAt: new Date(),
    },
  ],
  _count: { likes: 0, reviews: 0, comments: 0 },
};

describe('앱으로 보내기 형식', () => {
  it('섹션·이유·날짜·주의할 점이 그대로 넘어간다', () => {
    const parsed = parseSharedChecklist(generateAppShareText(checklist));
    expect(parsed).not.toBeNull();
    const data = sharedToChecklistData(parsed!);
    expect(data.peopleCount).toBe(2);
    expect(data.source?.startDate).toBe('2026-10-01');
    expect(data.cautions).toEqual(['육류 가공품은 반입할 수 없어요']);
    expect(data.items[0]).toMatchObject({ section: '전자기기', reason: '위탁 수하물에 넣을 수 없어요', baggage: 'carry_on' });
  });

  it('예전 버전 앱이 보낸 데이터(새 필드 없음)도 받는다', () => {
    const v1 = {
      id: 'shared_1', title: '캠핑', items: [{ title: '텐트', order: 0, quantity: 1, unit: '개' }],
      sharedAt: '2025-01-01T00:00:00.000Z', sharedBy: '아맞다이거! 사용자', originalId: 'x',
    };
    expect(validateSharedChecklistData(v1)).toBe(true);
    expect(sharedToChecklistData(v1).peopleCount).toBe(1);
  });

  it('형식이 잘못된 새 필드는 거절한다', () => {
    const base = {
      id: 'shared_1', title: '캠핑', items: [{ title: '텐트', order: 0 }],
      sharedAt: '2025-01-01', sharedBy: 'a', originalId: 'x',
    };
    expect(validateSharedChecklistData({ ...base, source: { kind: 'hack', peopleCount: 1, engineVersion: 1 } })).toBe(false);
    expect(validateSharedChecklistData({ ...base, source: { kind: 'situation', startDate: 'tomorrow', peopleCount: 1, engineVersion: 1 } })).toBe(false);
    expect(validateSharedChecklistData({ ...base, peopleCount: 0 })).toBe(false);
    expect(validateSharedChecklistData({ ...base, items: [{ title: '텐트', order: 0, baggage: 'pocket' }] })).toBe(false);
  });
});
