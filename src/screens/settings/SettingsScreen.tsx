import React, { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImportSheet } from '../../components/ImportSheet';
import { Icon, IconName } from '../../components/ui/Icon';
import { Chip, T, Tap, Toggle } from '../../components/ui/kit';
import { ThemeMode, usePreferencesStore } from '../../stores/preferencesStore';
import { makeStyles, useColors } from '../../theme';
import { RootStackParamList } from '../../types';
import { PLAY_STORE_LINK } from '../../utils/shareUtils';

type Nav = StackNavigationProp<RootStackParamList>;

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: '기기 설정' },
  { mode: 'light', label: '밝게' },
  { mode: 'dark', label: '어둡게' },
];

const SettingsScreen = () => {
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { themeMode, setThemeMode, reminderDefault, setReminderDefault } = usePreferencesStore();
  const [importing, setImporting] = useState(false);

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.titleRow}><T variant="title1">설정</T></View>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.card}>
          <T variant="title3" style={s.cardTitle}>화면</T>
          <T variant="body2" tone="text2" style={{ marginBottom: 12 }}>화면 밝기</T>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {THEME_OPTIONS.map(o => (
              <Chip key={o.mode} label={o.label} selected={themeMode === o.mode} onPress={() => setThemeMode(o.mode)} />
            ))}
          </View>
        </View>

        <View style={s.card}>
          <T variant="title3" style={s.cardTitle}>알림</T>
          <View style={s.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="body1">출발 전날 알림</T>
              <T variant="caption" tone="text2">날짜를 정한 리스트는 전날 오후 8시에 알려드려요</T>
            </View>
            <Toggle label="출발 전날 알림" value={reminderDefault} onChange={setReminderDefault} />
          </View>
        </View>

        <View style={s.card}>
          <T variant="title3" style={s.cardTitle}>리스트</T>
          <LinkRow icon="download" label="공유받은 리스트 가져오기" onPress={() => setImporting(true)} />
        </View>

        <View style={s.card}>
          <T variant="title3" style={s.cardTitle}>앱 정보</T>
          <LinkRow icon="heart" label="앱 평가하기" onPress={() => Linking.openURL(PLAY_STORE_LINK)} />
        </View>
      </ScrollView>

      <ImportSheet
        visible={importing}
        onClose={() => setImporting(false)}
        onImported={id => { setImporting(false); navigation.navigate('ChecklistDetail', { id }); }}
      />
    </View>
  );
};

const LinkRow = ({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) => {
  const s = useStyles();
  const c = useColors();
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={s.row}>
      <Icon name={icon} size={22} color={c.text2} />
      <T variant="body1" style={{ flex: 1 }}>{label}</T>
      <Icon name="chevronRight" size={18} color={c.text3} strokeWidth={2} />
    </Tap>
  );
};

const useStyles = makeStyles(c => ({
  root: { flex: 1, backgroundColor: c.canvas },
  header: { backgroundColor: c.card, paddingHorizontal: 20, paddingBottom: 8 },
  titleRow: { height: 56, justifyContent: 'center' },
  content: { padding: 12, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: c.card, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 16 },
  cardTitle: { marginBottom: 8 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 14 },
}));

export default SettingsScreen;
