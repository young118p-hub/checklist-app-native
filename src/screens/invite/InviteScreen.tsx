import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { BottomCTA, Button, T, TopBar } from '../../components/ui/kit';
import { Icon } from '../../components/ui/Icon';
import { LoginSheet } from '../../components/together';
import { useAuthStore } from '../../stores/authStore';
import { InvitePreview, together } from '../../sync/engine';
import { backendEnabled } from '../../sync/client';
import { memberColors, useColors } from '../../theme';
import { RootStackParamList } from '../../types';
import { formatDateLabel } from '../../utils/format';

type Nav = StackNavigationProp<RootStackParamList>;

const InviteScreen = () => {
  const c = useColors();
  const navigation = useNavigation<Nav>();
  const { code } = useRoute<RouteProp<RootStackParamList, 'Invite'>>().params;
  const [preview, setPreview] = useState<InvitePreview | null | 'error'>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [login, setLogin] = useState(false);

  useEffect(() => {
    if (!backendEnabled) { setLoading(false); setPreview('error'); return; }
    together.preview(code)
      .then(p => setPreview(p ?? 'error'))
      .catch(() => setPreview('error'))
      .finally(() => setLoading(false));
  }, [code]);

  // 로그인 직후에 부를 때는 아직 이전 렌더의 status를 보고 있어서 스토어에서 바로 읽는다
  const join = async () => {
    if (useAuthStore.getState().status !== 'signedIn') { setLogin(true); return; }
    setJoining(true);
    try {
      const id = await together.accept(code);
      navigation.replace('ChecklistDetail', { id });
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? '');
      Alert.alert('참여하지 못했어요', msg.includes('limit') ? '이 리스트는 인원이 가득 찼어요.' : '초대가 만료됐거나 인터넷 연결이 불안정해요.');
    } finally {
      setJoining(false);
    }
  };

  const p = preview && preview !== 'error' ? preview : null;
  const inviter = p?.inviter_nickname || '';
  const meta = p ? [p.start_date ? formatDateLabel(p.start_date) : null, `${p.people_count}명`, `${p.item_count}개 항목`].filter(Boolean).join(' · ') : '';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <TopBar onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 80 }} color={c.accent} />
      ) : !p ? (
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, gap: 8 }}>
          <Icon name="link" size={32} color={c.text3} />
          <T variant="title2" center>초대를 열 수 없어요</T>
          <T variant="body2" tone="text2" center>
            {backendEnabled ? '초대가 만료됐거나 취소됐어요. 초대한 분께 새 링크를 부탁해 주세요.' : '이 버전에서는 함께 챙기기를 쓸 수 없어요.'}
          </T>
        </View>
      ) : (
        <>
          <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingTop: 40 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: memberColors[0], alignItems: 'center', justifyContent: 'center' }}>
              <T size={24} weight="bold" style={{ color: '#16181D', lineHeight: 32 }}>{(inviter || '?').slice(0, 1)}</T>
            </View>
            <T variant="body2" tone="text2" style={{ marginTop: 16 }}>{inviter ? `${inviter}님이 초대했어요` : '함께 챙기기에 초대받았어요'}</T>
            <T variant="title1" center style={{ marginTop: 4 }}>{p.title}</T>
            <T size={14} tone="text3" style={{ marginTop: 4 }}>{meta}</T>
            <T size={14} tone="text2" style={{ marginTop: 24 }}>{p.member_count}명이 함께 챙기고 있어요</T>
            <View style={{ marginTop: 28, alignSelf: 'stretch', borderRadius: 16, backgroundColor: c.fillSubtle, padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Icon name="check" size={20} color={c.accent} strokeWidth={2.2} />
                <T size={14} style={{ flex: 1 }}>같이 챙길 준비물은 담당을 나눠 맡을 수 있어요</T>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Icon name="check" size={20} color={c.accent} strokeWidth={2.2} />
                <T size={14} style={{ flex: 1 }}>내가 챙긴 항목에 이름 보이기는 기본으로 꺼져 있어요</T>
              </View>
            </View>
          </View>
          <View style={{ flex: 1 }} />
          <BottomCTA>
            {p.already_member
              ? <Button label="리스트 열기" onPress={() => navigation.replace('ChecklistDetail', { id: p.checklist_id })} />
              : <Button label={joining ? '참여하는 중…' : '참여하기'} disabled={joining} onPress={() => join()} />}
            <Button label="나중에 할게요" kind="ghost" onPress={() => navigation.goBack()} />
          </BottomCTA>
        </>
      )}
      <LoginSheet visible={login} onClose={() => setLogin(false)} title="참여하려면 로그인이 필요해요"
        onSignedIn={() => setTimeout(join, 300)} />
    </View>
  );
};

export default InviteScreen;
