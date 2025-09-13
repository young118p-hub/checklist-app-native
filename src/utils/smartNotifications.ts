import { SmartNotification, Checklist, ChecklistItem } from '../types';
import { generateUUID } from './uuid';

export class SmartNotificationSystem {
  // 시간 기반 리마인더 생성
  static createTimeBasedReminder(checklist: Checklist, hours: number): SmartNotification {
    const scheduledTime = new Date(Date.now() + hours * 60 * 60 * 1000);
    
    return {
      id: generateUUID(),
      type: 'reminder',
      title: `📝 ${checklist.title} 체크리스트 리마인더`,
      message: `"${checklist.title}" 체크리스트를 완료하는 것을 잊지 마세요! 💪`,
      actionData: { checklistId: checklist.id, type: 'open_checklist' },
      isRead: false,
      createdAt: new Date(),
      scheduledFor: scheduledTime,
    };
  }

  // 상황별 스마트 리마인더 생성
  static createContextualReminders(checklist: Checklist): SmartNotification[] {
    const reminders: SmartNotification[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // 체크리스트 이름으로 상황 판단
    const title = checklist.title.toLowerCase();
    
    // 출근/업무 관련
    if (title.includes('회사') || title.includes('출근') || title.includes('업무')) {
      if (currentHour >= 7 && currentHour <= 9 && currentDay >= 1 && currentDay <= 5) {
        reminders.push({
          id: generateUUID(),
          type: 'reminder',
          title: '🏢 출근 준비 리마인더',
          message: `좋은 하루의 시작! "${checklist.title}"을(를) 확인해보세요 ☕`,
          actionData: { checklistId: checklist.id, type: 'open_checklist' },
          isRead: false,
          createdAt: new Date(),
          scheduledFor: new Date(now.getTime() + 10 * 60 * 1000), // 10분 후
        });
      }
    }
    
    // 여행/나들이 관련
    if (title.includes('여행') || title.includes('나들이') || title.includes('데이트')) {
      if (currentDay === 5 || currentDay === 6) { // 금요일, 토요일
        reminders.push({
          id: generateUUID(),
          type: 'reminder',
          title: '✈️ 즐거운 시간 준비!',
          message: `주말이 다가와요! "${checklist.title}" 준비는 어떻게 되고 있나요? 🎒`,
          actionData: { checklistId: checklist.id, type: 'open_checklist' },
          isRead: false,
          createdAt: new Date(),
          scheduledFor: new Date(now.getTime() + 30 * 60 * 1000), // 30분 후
        });
      }
    }
    
    // 병원/의료 관련
    if (title.includes('병원') || title.includes('건강검진') || title.includes('의료')) {
      reminders.push({
        id: generateUUID(),
        type: 'reminder',
        title: '🏥 건강 관리 리마인더',
        message: `건강이 최우선! "${checklist.title}"을(를) 잊지 마세요 💊`,
        actionData: { checklistId: checklist.id, type: 'open_checklist' },
        isRead: false,
        createdAt: new Date(),
        scheduledFor: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2시간 후
      });
    }
    
    return reminders;
  }

  // 완료률 기반 격려 알림
  static createCompletionBasedNotification(checklist: Checklist): SmartNotification | null {
    const completedItems = checklist.items.filter(item => item.isCompleted);
    const completionRate = (completedItems.length / checklist.items.length) * 100;
    
    if (completionRate === 0) {
      return {
        id: generateUUID(),
        type: 'suggestion',
        title: '🚀 시작이 반이에요!',
        message: `"${checklist.title}"의 첫 번째 항목부터 시작해보세요! 작은 시작이 큰 성취를 만들어요.`,
        actionData: { checklistId: checklist.id, type: 'open_checklist' },
        isRead: false,
        createdAt: new Date(),
      };
    }
    
    if (completionRate >= 25 && completionRate < 50) {
      return {
        id: generateUUID(),
        type: 'suggestion',
        title: '💪 좋은 페이스네요!',
        message: `"${checklist.title}"가 ${Math.round(completionRate)}% 완료되었어요. 계속 화이팅! 🔥`,
        actionData: { checklistId: checklist.id, type: 'open_checklist' },
        isRead: false,
        createdAt: new Date(),
      };
    }
    
    if (completionRate >= 75 && completionRate < 100) {
      return {
        id: generateUUID(),
        type: 'suggestion',
        title: '🏁 거의 완료!',
        message: `"${checklist.title}"가 ${Math.round(completionRate)}% 완료! 마지막까지 화이팅하세요! 🎯`,
        actionData: { checklistId: checklist.id, type: 'open_checklist' },
        isRead: false,
        createdAt: new Date(),
      };
    }
    
    return null;
  }

  // 주간 요약 알림
  static createWeeklySummary(checklists: Checklist[]): SmartNotification {
    const completedChecklists = checklists.filter(checklist => 
      checklist.items.every(item => item.isCompleted)
    ).length;
    
    const totalItems = checklists.reduce((sum, checklist) => sum + checklist.items.length, 0);
    const completedItems = checklists.reduce((sum, checklist) => 
      sum + checklist.items.filter(item => item.isCompleted).length, 0
    );
    
    const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    return {
      id: generateUUID(),
      type: 'weekly_summary',
      title: '📊 이번 주 체크리스트 요약',
      message: `이번 주에 ${completedChecklists}개의 체크리스트를 완료했어요! 전체 완료율: ${completionRate}% 🎉`,
      actionData: { type: 'view_my_checklists' },
      isRead: false,
      createdAt: new Date(),
    };
  }

  // 놓친 항목 알림
  static createMissedItemsNotification(analytics: any[]): SmartNotification | null {
    const frequentlyMissed = analytics
      .filter(item => item.missRate > 50 && item.totalSeen >= 3)
      .slice(0, 3);
    
    if (frequentlyMissed.length === 0) return null;
    
    const itemNames = frequentlyMissed.map(item => item.title).join(', ');
    
    return {
      id: generateUUID(),
      type: 'suggestion',
      title: '🎯 자주 놓치는 항목들',
      message: `${itemNames} 등을 자주 놓치고 계시네요. 다음번엔 특별히 주의해보세요! 💡`,
      actionData: { type: 'view_analytics' },
      isRead: false,
      createdAt: new Date(),
    };
  }

  // 계절별 추천 알림
  static createSeasonalSuggestion(): SmartNotification {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    
    let suggestion = '';
    let emoji = '🌟';
    
    if (month >= 3 && month <= 5) { // 봄
      suggestion = '봄나들이나 벚꽃구경 체크리스트는 어떠세요? 따뜻한 계절을 만끽해보세요!';
      emoji = '🌸';
    } else if (month >= 6 && month <= 8) { // 여름
      suggestion = '여름휴가나 해수욕장 체크리스트로 시원한 여름을 준비해보세요!';
      emoji = '🏖️';
    } else if (month >= 9 && month <= 11) { // 가을
      suggestion = '단풍구경이나 가을 피크닉 체크리스트는 어떠세요? 아름다운 계절이에요!';
      emoji = '🍂';
    } else { // 겨울
      suggestion = '연말연시 파티나 스키장 체크리스트로 따뜻한 겨울을 보내세요!';
      emoji = '❄️';
    }
    
    return {
      id: generateUUID(),
      type: 'suggestion',
      title: `${emoji} 계절 추천`,
      message: suggestion,
      actionData: { type: 'browse_templates' },
      isRead: false,
      createdAt: new Date(),
    };
  }
}