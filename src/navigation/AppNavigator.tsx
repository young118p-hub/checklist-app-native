import React, { useRef, useState, useCallback, createContext, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinkingOptions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';

// Import screens
import HomeScreen from '../screens/home/HomeScreen';
import MyChecklistsScreen from '../screens/my/MyChecklistsScreen';
import CreateChecklistScreen from '../screens/create/CreateChecklistScreen';
import ChecklistDetailScreen from '../screens/checklist/ChecklistDetailScreen';

import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

// 탭 전환 Context (스와이프 탭에서 화면 간 이동용)
const TAB_KEYS = ['Home', 'MyChecklists', 'Create'] as const;
type TabKey = typeof TAB_KEYS[number];
const TabSwitchContext = createContext<(tab: TabKey) => void>(() => {});
export const useTabSwitch = () => useContext(TabSwitchContext);

const TAB_CONFIG = [
  { key: 'Home', title: '아맞다이거!', label: '홈', icon: 'home' as const },
  { key: 'MyChecklists', title: '내 리스트', label: '내 리스트', icon: 'list' as const },
  { key: 'Create', title: '새로 만들기', label: '만들기', icon: 'add-circle' as const },
];

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(0);

  const onPageSelected = useCallback((e: any) => {
    setActiveTab(e.nativeEvent.position);
  }, []);

  const onTabPress = useCallback((index: number) => {
    pagerRef.current?.setPage(index);
    setActiveTab(index);
  }, []);

  const switchTab = useCallback((tab: TabKey) => {
    const index = TAB_KEYS.indexOf(tab);
    if (index >= 0) {
      pagerRef.current?.setPage(index);
      setActiveTab(index);
    }
  }, []);

  return (
    <TabSwitchContext.Provider value={switchTab}>
    <View style={{ flex: 1 }}>
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>{TAB_CONFIG[activeTab].title}</Text>
      </View>

      {/* 스와이프 가능한 페이지 */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={onPageSelected}
      >
        <View key="0" style={{ flex: 1 }}>
          <HomeScreen />
        </View>
        <View key="1" style={{ flex: 1 }}>
          <MyChecklistsScreen />
        </View>
        <View key="2" style={{ flex: 1 }}>
          <CreateChecklistScreen />
        </View>
      </PagerView>

      {/* 하단 탭 바 */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TAB_CONFIG.map((tab, index) => {
          const isActive = activeTab === index;
          const color = isActive ? '#DC2626' : '#6B7280';
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => onTabPress(index)}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon} size={24} color={color} />
              <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
            </TouchableOpacity>
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

export const AppNavigator = () => {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#DC2626',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      >
        <Stack.Screen
          name="Main"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChecklistDetail"
          component={ChecklistDetailScreen}
          options={{
            title: '체크리스트',
            headerBackTitle: '뒤로',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});
