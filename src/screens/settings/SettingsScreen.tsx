import React, { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ImportSheet } from '../../components/ImportSheet';
import { Icon, IconName } from '../../components/ui/Icon';
import { Button, Chip, Field, Sheet, T, Tap, Toggle } from '../../components/ui/kit';
import { LoginSheet } from '../../components/together';
import { useAuthStore } from '../../stores/authStore';
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
  const auth = useAuthStore();
  const [login, setLogin] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const confirmSignOut = () => Alert.alert('로그아웃할까요?', '다른 사람이 만든 함께 쓰는 리스트는 이 휴대폰에서 사라지고, 내가 만든 리스트는 그대로 남아요.', [
    { text: '취소', style: 'cancel' },
    { text: '로그아웃', style: 'destructive', onPress: () => auth.signOut() },
  ]);

  const confirmDelete = () => Alert.alert('계정을 삭제할까요?', '서버에 저장된 내 정보와 내가 만든 리스트가 모두 지워져요. 내가 만든 리스트를 함께 쓰던 사람들에게서도 사라져요. 이 휴대폰에 있는 내 리스트는 남아요.', [
    { text: '취소', style: 'cancel' },
    {
      text: '삭제', style: 'destructive', onPress: async () => {
        try {
          await auth.deleteAccount();
          Alert.alert('계정을 삭제했어요');
        } catch {
          Alert.alert('삭제하지 못했어요', '인터넷 연결을 확인하고 다시 시도해 주세요.');
        }
      },
    },
  ]);

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

        {auth.status !== 'unavailable' && (
          <View style={s.card}>
            <T variant="title3" style={s.cardTitle}>계정</T>
            {auth.status === 'signedIn' ? (
              <>
                <LinkRow icon="pencil" label={auth.nickname ? `이름 · ${auth.nickname}` : '이름 정하기'} onPress={() => setEditingName(true)} />
                <T variant="caption" tone="text3" style={{ marginTop: -8, marginBottom: 8, marginLeft: 36 }}>
                  {providerLabel(auth.provider)}로 로그인했어요 · 함께 챙기는 사람에게 이 이름이 보여요
                </T>
                <LinkRow icon="close" label="로그아웃" onPress={confirmSignOut} />
                <LinkRow icon="trash" label="계정 삭제" danger onPress={confirmDelete} />
              </>
            ) : (
              <LinkRow icon="heart" label="로그인" sub="함께 챙길 때만 필요해요" onPress={() => setLogin(true)} />
            )}
          </View>
        )}

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
        onInvite={code => { setImporting(false); navigation.navigate('Invite', { code }); }}
      />
      <LoginSheet visible={login} onClose={() => setLogin(false)} title="로그인" />
      <NameSheet visible={editingName} initial={auth.nickname} onClose={() => setEditingName(false)}
        onSave={async (name) => {
          try { await auth.updateNickname(name); setEditingName(false); }
          catch { Alert.alert('저장하지 못했어요', '인터넷 연결을 확인하고 다시 시도해 주세요.'); }
        }} />
    </View>
  );
};

const providerLabel = (p: string | null) =>
  p === 'kakao' ? '카카오' : p === 'google' ? 'Google' : p?.includes('naver') ? '네이버' : '소셜 계정';

const NameSheet = ({ visible, initial, onClose, onSave }: {
  visible: boolean; initial: string; onClose: () => void; onSave: (name: string) => void;
}) => {
  const [name, setName] = useState(initial);
  useEffect(() => { if (visible) setName(initial); }, [visible, initial]);
  return (
    <Sheet visible={visible} onClose={onClose} title="이름">
      <T variant="body2" tone="text2" style={{ marginBottom: 12 }}>함께 챙기는 사람에게 보이는 이름이에요</T>
      <Field value={name} onChangeText={setName} placeholder="예: 민지" maxLength={20} autoFocus />
      <Button label="저장" disabled={!name.trim()} style={{ marginTop: 16 }} onPress={() => onSave(name)} />
    </Sheet>
  );
};

const LinkRow = ({ icon, label, sub, onPress, danger }: {
  icon: IconName; label: string; sub?: string; onPress: () => void; danger?: boolean;
}) => {
  const s = useStyles();
  const c = useColors();
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={s.row}>
      <Icon name={icon} size={22} color={danger ? c.danger : c.text2} />
      <View style={{ flex: 1 }}>
        <T variant="body1" tone={danger ? 'danger' : 'text1'}>{label}</T>
        {sub && <T variant="caption" tone="text3">{sub}</T>}
      </View>
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
