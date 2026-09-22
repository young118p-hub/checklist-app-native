import { createContext, useContext } from 'react';

// 화면 간 탭 전환 (스와이프 탭이라 React Navigation 탭 대신 직접 관리)
export const TAB_KEYS = ['Home', 'MyChecklists', 'Browse', 'Settings'] as const;
export type TabKey = typeof TAB_KEYS[number];

interface TabContext {
  switchTab: (tab: TabKey, options?: { focusSearch?: boolean }) => void;
  activeTab: TabKey;
  searchFocusToken: number;   // 둘러보기로 넘어가며 검색창에 바로 포커스할 때 바뀜
}

export const TabSwitchContext = createContext<TabContext>({
  switchTab: () => {},
  activeTab: 'Home',
  searchFocusToken: 0,
});

export const useTabSwitch = () => useContext(TabSwitchContext).switchTab;
export const useTabState = () => useContext(TabSwitchContext);

// 하단 탭 바 높이 (FAB 위치 계산용, 안전 영역 제외)
export const TAB_BAR_HEIGHT = 64;
