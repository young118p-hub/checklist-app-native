import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { T } from './kit';
import { useColors } from '../../theme';

// 혼자 쓸 때는 모든 데이터가 기기에 저장되므로 안내만 한다
export const OfflineNotice = () => {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);

  useEffect(() => NetInfo.addEventListener(state => setOffline(state.isConnected === false)), []);

  if (!offline) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, alignItems: 'center' }}>
      <View style={{ backgroundColor: c.chipOn, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 }}>
        <T size={13} weight="medium" tone="onChipOn">오프라인이에요 · 기기에 그대로 저장돼요</T>
      </View>
    </View>
  );
};
