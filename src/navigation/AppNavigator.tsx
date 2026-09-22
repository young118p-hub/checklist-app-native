import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { DarkTheme, DefaultTheme, LinkingOptions, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';

import HomeScreen from '../screens/home/HomeScreen';
import MyChecklistsScreen from '../screens/my/MyChecklistsScreen';
import BrowseScreen from '../screens/browse/BrowseScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import CreateScreen from '../screens/create/CreateScreen';
import ChecklistDetailScreen from '../screens/checklist/ChecklistDetailScreen';
import { Icon, IconName } from '../components/ui/Icon';
import { T, Tap } from '../components/ui/kit';
import { useColors, useIsDark } from '../theme';
import { RootStackParamList } from '../types';
import { TAB_BAR_HEIGHT, TAB_KEYS, TabKey, TabSwitchContext } from './tabs';

const Stack = createStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'Home', label: '홈', icon: 'home' },
  { key: 'MyChecklists', label: '내 리스트', icon: 'list' },
  { key: 'Browse', label: '둘러보기', icon: 'compass' },
  { key: 'Settings', label: '설정', icon: 'sliders' },
];

const TabNavigator = () => {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const [active, setActive] = useState(0);
  const [searchFocusToken, setSearchFocusToken] = useState(0);

  const switchTab = useCallback((tab: TabKey, options?: { focusSearch?: boolean }) => {
    const index = TAB_KEYS.indexOf(tab);
    if (index < 0) return;
    pagerRef.current?.setPage(index);
    setActive(index);
    if (options?.focusSearch) setSearchFocusToken(t => t + 1);
  }, []);

  const context = useMemo(
    () => ({ switchTab, activeTab: TAB_KEYS[active], searchFocusToken }),
    [switchTab, active, searchFocusToken],
  );

  return (
    <TabSwitchContext.Provider value={context}>
      <View style={{ flex: 1, backgroundColor: c.canvas }}>
        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          initialPage={0}
          onPageSelected={e => setActive(e.nativeEvent.position)}
        >
          <View key="0" style={{ flex: 1 }}><HomeScreen /></View>
          <View key="1" style={{ flex: 1 }}><MyChecklistsScreen /></View>
          <View key="2" style={{ flex: 1 }}><BrowseScreen /></View>
          <View key="3" style={{ flex: 1 }}><SettingsScreen /></View>
        </PagerView>

        <View
          style={{
            flexDirection: 'row', backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.border,
            height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom,
          }}
        >
          {TABS.map((tab, index) => {
            const on = index === active;
            return (
              <Tap
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={tab.label}
                onPress={() => switchTab(tab.key)}
                pressedOpacity={0.7}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <Icon name={tab.icon} size={24} color={on ? c.text1 : c.text3} strokeWidth={on ? 2 : 1.8} />
                <T variant="label" weight={on ? 'semibold' : 'medium'} tone={on ? 'text1' : 'text3'}>{tab.label}</T>
              </Tap>
            );
          })}
        </View>
      </View>
    </TabSwitchContext.Provider>
  );
};

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['amajdaigeo://'],
  config: {
    screens: {
      Main: 'home',
      ChecklistDetail: 'checklist/:id',
    },
  },
};

export const AppNavigator = ({ onReady }: { onReady?: () => void }) => {
  const c = useColors();
  const dark = useIsDark();
  const base = dark ? DarkTheme : DefaultTheme;
  const theme = useMemo(() => ({
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.bg, text: c.text1, border: c.border, primary: c.accent },
  }), [base, c]);

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={theme} onReady={onReady}>
      <Stack.Navigator screenOptions={{ headerShown: false, ...TransitionPresets.SlideFromRightIOS }}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen name="ChecklistDetail" component={ChecklistDetailScreen} />
        <Stack.Screen name="Create" component={CreateScreen} options={{ ...TransitionPresets.ModalSlideFromBottomIOS }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
