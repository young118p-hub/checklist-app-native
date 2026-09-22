import { create } from 'zustand';
import * as WebBrowser from 'expo-web-browser';
import { Session } from '@supabase/supabase-js';
import { backendEnabled, supabase } from '../sync/client';
import { sync } from '../sync/engine';

export type LoginProvider = 'kakao' | 'naver' | 'google';

// Supabase 대시보드 Authentication > URL Configuration 의 Redirect URLs 에 등록해야 한다
export const AUTH_REDIRECT = 'amajdaigeo://auth-callback';

interface AuthState {
  status: 'unavailable' | 'loading' | 'signedOut' | 'signedIn';
  userId: string | null;
  nickname: string;
  provider: string | null;
  init: () => Promise<void>;
  signIn: (provider: LoginProvider) => Promise<'ok' | 'cancel'>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
}

const providerId = (p: LoginProvider) => (p === 'naver' ? 'custom:naver' : p);

export const useAuthStore = create<AuthState>((set, get) => {
  const onSession = async (session: Session | null) => {
    const user = session?.user;
    if (!user) {
      if (get().userId) await sync.stop();
      set({ status: 'signedOut', userId: null, nickname: '', provider: null });
      return;
    }
    const first = get().userId !== user.id;
    set({
      status: 'signedIn',
      userId: user.id,
      provider: (user.app_metadata?.provider as string) ?? null,
    });
    if (first) {
      const { data } = await supabase!.from('profiles').select('nickname').eq('id', user.id).maybeSingle();
      set({ nickname: data?.nickname ?? '' });
      await sync.start(user.id);
    }
  };

  return {
    status: backendEnabled ? 'loading' : 'unavailable',
    userId: null,
    nickname: '',
    provider: null,

    init: async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      await onSession(data.session);
      supabase.auth.onAuthStateChange((_event, session) => {
        // 콜백 안에서 Supabase를 다시 부르면 막힐 수 있어서 다음 틱으로 넘긴다
        setTimeout(() => onSession(session), 0);
      });
    },

    signIn: async (provider) => {
      if (!supabase) throw new Error('backend disabled');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: providerId(provider) as never,
        options: { redirectTo: AUTH_REDIRECT, skipBrowserRedirect: true },
      });
      if (error || !data?.url) throw error ?? new Error('no auth url');
      const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT);
      if (result.type !== 'success') return 'cancel';
      const url = new URL(result.url);
      const failure = url.searchParams.get('error_description') ?? url.searchParams.get('error');
      if (failure) throw new Error(failure);
      const code = url.searchParams.get('code');
      if (!code) throw new Error('no auth code');
      const exchanged = await supabase.auth.exchangeCodeForSession(code);
      if (exchanged.error) throw exchanged.error;
      await onSession(exchanged.data.session);
      return 'ok';
    },

    signOut: async () => {
      await supabase?.auth.signOut();
      await onSession(null);
    },

    // 서버의 내 정보와 내가 만든 리스트를 지운다 (Play 정책: 앱 안에서 계정 삭제)
    deleteAccount: async () => {
      if (!supabase) return;
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      await supabase.auth.signOut({ scope: 'local' });
      await onSession(null);
    },

    updateNickname: async (nickname) => {
      const userId = get().userId;
      if (!supabase || !userId) return;
      const { error } = await supabase.from('profiles').update({ nickname: nickname.trim() }).eq('id', userId);
      if (error) throw error;
      set({ nickname: nickname.trim() });
      await sync.now();
    },
  };
});
