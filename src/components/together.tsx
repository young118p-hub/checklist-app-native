import React, { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from 'react-native-svg';
import { Button, Sheet, SheetRow, T, Tap, Toggle } from './ui/kit';
import { Icon } from './ui/Icon';
import { memberColors, useColors } from '../theme';
import { Checklist, Member } from '../types';
import { LoginProvider, useAuthStore } from '../stores/authStore';
import { naverEnabled } from '../sync/client';
import { together } from '../sync/engine';
import { PLAY_STORE_LINK, shareChecklist } from '../utils/shareUtils';

// ───────────── 멤버 표시 ─────────────

export const memberName = (m: Member) => (m.isMe ? '나' : m.nickname || '멤버');
const initial = (m: Member) => (m.isMe ? '나' : (m.nickname || '?').slice(0, 1));

// 색만으로 구분하지 않고 항상 이니셜과 함께 (토큰 보드)
export const Avatar = ({ member, size = 32, ring }: { member: Member; size?: number; ring?: string }) => {
  const c = useColors();
  const bg = memberColors[member.colorIndex] ?? c.fill;
  return (
    <View
      accessibilityLabel={memberName(member)}
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: ring ? 2 : 0, borderColor: ring,
      }}
    >
      <T size={Math.round(size * 0.42)} weight="bold" style={{ color: bg === c.fill ? c.text1 : '#16181D', lineHeight: Math.round(size * 0.6) }}>
        {initial(member)}
      </T>
    </View>
  );
};

export const AvatarStack = ({ members, size = 28, ring, max = 4 }: { members: Member[]; size?: number; ring: string; max?: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {members.slice(0, max).map((m, i) => (
      <View key={m.userId} style={{ marginLeft: i === 0 ? 0 : -8 }}>
        <Avatar member={m} size={size} ring={ring} />
      </View>
    ))}
  </View>
);

export const isShared = (c: Checklist) => (c.remote?.members.length ?? 0) > 1;

// ───────────── 로그인 ─────────────

const KakaoMark = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24"><Path fill="#191919" d="M12 4C7 4 3 7.1 3 11c0 2.5 1.7 4.7 4.2 5.9l-.9 3.3c-.1.3.3.6.6.4l3.9-2.6c.4 0 .8.1 1.2.1 5 0 9-3.1 9-7s-4-7-9-7z" /></Svg>
);
const NaverMark = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24"><Path fill="#FFFFFF" d="M15.3 12.6L8.4 3H3v18h5.7v-9.6L15.6 21H21V3h-5.7z" /></Svg>
);
const GoogleMark = () => (
  <Svg width={20} height={20} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Svg>
);

const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL;
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;

export const LoginSheet = ({ visible, onClose, onSignedIn, title = '함께 챙기려면 로그인이 필요해요' }: {
  visible: boolean; onClose: () => void; onSignedIn?: () => void; title?: string;
}) => {
  const signIn = useAuthStore(s => s.signIn);
  const [busy, setBusy] = useState<LoginProvider | null>(null);

  const go = async (provider: LoginProvider) => {
    if (busy) return;
    setBusy(provider);
    try {
      const result = await signIn(provider);
      if (result === 'ok') {
        onClose();
        onSignedIn?.();
      }
    } catch (e) {
      console.warn('login failed', e);
      Alert.alert('로그인하지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  const brand = (provider: LoginProvider, label: string, bg: string, fg: string, mark: React.ReactNode, border?: string) => (
    <Tap
      key={provider}
      accessibilityRole="button"
      onPress={() => go(provider)}
      style={{
        height: 52, borderRadius: 12, backgroundColor: bg, borderWidth: border ? 1 : 0, borderColor: border,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      {busy === provider ? <ActivityIndicator color={fg} /> : mark}
      <T size={16} weight="semibold" style={{ color: fg }}>{label}</T>
    </Tap>
  );

  return (
    <Sheet visible={visible} onClose={onClose}>
      <T variant="title2" style={{ marginTop: 12 }}>{title}</T>
      <T size={14} tone="text2" style={{ marginTop: 4 }}>혼자 쓸 때는 지금처럼 로그인 없이 쓸 수 있어요</T>
      <View style={{ gap: 8, marginTop: 24 }}>
        {brand('kakao', '카카오 로그인', '#FEE500', '#191919', <KakaoMark />)}
        {naverEnabled && brand('naver', '네이버 로그인', '#03C75A', '#FFFFFF', <NaverMark />)}
        {brand('google', 'Google로 로그인', '#FFFFFF', '#1F1F1F', <GoogleMark />, '#747775')}
      </View>
      <View style={{ minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
        <T size={12} tone="text3">로그인하면 </T>
        <Tap disabled={!TERMS_URL} onPress={() => TERMS_URL && Linking.openURL(TERMS_URL)} hitSlop={10}>
          <T size={12} tone="text2" style={{ textDecorationLine: TERMS_URL ? 'underline' : 'none' }}>이용약관</T>
        </Tap>
        <T size={12} tone="text3">과 </T>
        <Tap disabled={!PRIVACY_URL} onPress={() => PRIVACY_URL && Linking.openURL(PRIVACY_URL)} hitSlop={10}>
          <T size={12} tone="text2" style={{ textDecorationLine: PRIVACY_URL ? 'underline' : 'none' }}>개인정보처리방침</T>
        </Tap>
        <T size={12} tone="text3">에 동의하게 돼요</T>
      </View>
      <Button label="나중에 할게요" kind="ghost" onPress={onClose} />
    </Sheet>
  );
};

// ───────────── 초대 ─────────────

export const inviteLink = (code: string) => `amajdaigeo://invite/${code}`;

export const inviteMessage = (checklist: Checklist, code: string, inviter: string) =>
  [
    `[아맞다이거!] ${inviter ? `${inviter}님이 ` : ''}'${checklist.title}'을 함께 챙기자고 초대했어요`,
    '',
    `앱에서 열기: ${inviteLink(code)}`,
    `앱이 없다면: ${PLAY_STORE_LINK}`,
    '',
    '링크가 안 눌리면 이 메시지를 복사해서 앱 설정 > 공유받은 리스트 가져오기에 붙여 넣어 주세요.',
  ].join('\n');

// 붙여 넣은 글에서 초대 코드를 찾는다
export const findInviteCode = (text: string): string | null =>
  text.match(/amajdaigeo:\/\/invite\/([0-9a-f]{32})/)?.[1] ?? null;

export const TogetherSheet = ({ visible, onClose, checklist, onMembers }: {
  visible: boolean; onClose: () => void; checklist: Checklist; onMembers: () => void;
}) => {
  const status = useAuthStore(s => s.status);
  const [login, setLogin] = useState<null | 'message' | 'copy'>(null);
  const [busy, setBusy] = useState(false);
  const c = useColors();
  const members = checklist.remote?.members ?? [];
  const serverReady = status !== 'unavailable';

  const invite = async (mode: 'message' | 'copy') => {
    const auth = useAuthStore.getState();   // 로그인 직후 호출될 때 최신 상태를 보려고
    if (auth.status !== 'signedIn') {
      setLogin(mode);
      return;
    }
    setBusy(true);
    try {
      const code = await together.createInvite(checklist.id);
      const text = inviteMessage(checklist, code, auth.nickname);
      if (mode === 'copy') {
        await Clipboard.setStringAsync(text);
        Alert.alert('초대 메시지를 복사했어요', '메신저에 붙여 넣어 보내 주세요.');
      } else {
        await Share.share({ message: text });
      }
      onClose();
    } catch (e) {
      console.warn('invite failed', e);
      Alert.alert('초대 링크를 만들지 못했어요', '인터넷 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet visible={visible && !login} onClose={onClose}>
        <T variant="title2" style={{ marginTop: 12 }} numberOfLines={1}>{checklist.title} 함께 챙기기</T>
        <T size={14} tone="text3" style={{ marginTop: 2, marginBottom: 8 }}>
          {serverReady ? '초대한 사람과 같은 리스트를 보면서 나눠 챙겨요' : '리스트를 보내서 같이 볼 수 있어요'}
        </T>
        {serverReady && (
          <>
            <SheetRow icon="message" label="초대 메시지 보내기" sub="카카오톡 등으로 보내면 받은 사람이 로그인해서 같이 체크해요"
              onPress={() => invite('message')} />
            <SheetRow icon="link" label="초대 메시지 복사" sub="다른 메신저에 붙여 넣을 때 써요" onPress={() => invite('copy')} />
          </>
        )}
        <SheetRow icon="doc" label="텍스트로 보내기" sub="앱이 없어도 목록을 읽을 수 있어요"
          onPress={() => { onClose(); shareChecklist(checklist, 'text'); }} />
        <SheetRow icon="download" label="복사본 보내기" sub="받은 사람 앱에 따로 한 벌 생겨요 (같이 체크되지 않음)"
          onPress={() => { onClose(); shareChecklist(checklist, 'app'); }} />
        {members.length > 1 && (
          <View style={{ marginTop: 12, height: 64, borderRadius: 16, backgroundColor: c.fillSubtle, paddingLeft: 16, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AvatarStack members={members} size={32} ring={c.fillSubtle} />
            <T size={14} tone="text2" style={{ flex: 1 }}>{members.length}명이 함께 챙기고 있어요</T>
            <Tap accessibilityRole="button" onPress={() => { onClose(); onMembers(); }} style={{ height: 48, paddingHorizontal: 12, justifyContent: 'center' }}>
              <T size={14} weight="semibold">멤버 관리</T>
            </Tap>
          </View>
        )}
        {busy && <ActivityIndicator style={{ marginTop: 8 }} color={c.accent} />}
        <Button label="닫기" kind="secondary" onPress={onClose} style={{ marginTop: 16, height: 52 }} />
      </Sheet>
      <LoginSheet
        visible={!!login}
        onClose={() => setLogin(null)}
        onSignedIn={() => { const mode = login; setLogin(null); if (mode) setTimeout(() => invite(mode), 300); }}
      />
    </>
  );
};

// ───────────── 멤버 관리 ─────────────

export const MembersSheet = ({ visible, onClose, checklist, onInvite, onLeave }: {
  visible: boolean; onClose: () => void; checklist: Checklist; onInvite: () => void; onLeave: () => void;
}) => {
  const c = useColors();
  const members = checklist.remote?.members ?? [];
  const me = members.find(m => m.isMe);
  const [saving, setSaving] = useState(false);

  const toggleName = async (on: boolean) => {
    setSaving(true);
    try {
      await together.setShowName(checklist.id, on);
    } catch {
      Alert.alert('바꾸지 못했어요', '인터넷 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <T variant="title2" style={{ marginTop: 12, marginBottom: 8 }}>함께 챙기는 사람 {members.length}명</T>
      {members.map(m => (
        <View key={m.userId} style={{ height: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar member={m} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <T size={16} weight="semibold">{m.isMe ? `${m.nickname || '나'} (나)` : memberName(m)}</T>
            <T variant="caption" tone="text3">{m.showName ? '이름 공개 중' : '이름 비공개'}</T>
          </View>
          {m.role === 'owner' && (
            <View style={{ height: 26, paddingHorizontal: 8, borderRadius: 13, backgroundColor: c.fill, justifyContent: 'center' }}>
              <T size={12} weight="semibold" tone="text2">만든 사람</T>
            </View>
          )}
        </View>
      ))}
      {me && (
        <View style={{ marginTop: 12, borderRadius: 16, backgroundColor: c.fillSubtle, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <T size={15} weight="semibold">내가 챙긴 항목에 이름 보이기</T>
            <T variant="caption" tone="text2">꺼두면 '챙겼어요'로만 보여요. 진행률에는 그대로 반영돼요</T>
          </View>
          {saving ? <ActivityIndicator color={c.accent} /> : <Toggle label="내가 챙긴 항목에 이름 보이기" value={me.showName} onChange={toggleName} />}
        </View>
      )}
      <Button label="더 초대하기" icon="message" onPress={() => { onClose(); onInvite(); }} style={{ marginTop: 20, height: 52 }} />
      {me?.role !== 'owner' && (
        <Button label="이 리스트에서 나가기" kind="dangerGhost" onPress={() => { onClose(); onLeave(); }} />
      )}
    </Sheet>
  );
};

// ───────────── 담당 정하기 ─────────────

export const AssigneeSheet = ({ visible, onClose, members, current, onPick }: {
  visible: boolean; onClose: () => void; members: Member[]; current?: string; onPick: (userId: string | undefined) => void;
}) => {
  const c = useColors();
  return (
    <Sheet visible={visible} onClose={onClose} title="누가 챙길까요?">
      {members.map(m => (
        <Tap key={m.userId} accessibilityRole="radio" accessibilityState={{ selected: current === m.userId }}
          onPress={() => onPick(m.userId)} style={{ height: 60, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar member={m} size={36} />
          <T size={16} weight="semibold" style={{ flex: 1 }}>{m.isMe ? '내가 챙길게요' : `${memberName(m)}님`}</T>
          {current === m.userId && <Icon name="check" size={20} color={c.accentStrong} strokeWidth={2.4} />}
        </Tap>
      ))}
      {current && <Button label="담당 없애기" kind="ghost" onPress={() => onPick(undefined)} />}
    </Sheet>
  );
};
