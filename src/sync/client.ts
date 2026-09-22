import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as ExpoCrypto from 'expo-crypto';

// Hermes에는 WebCrypto가 없어서 supabase-js가 PKCE를 Math.random + 'plain' 방식으로 떨어뜨린다.
// expo-crypto로 난수와 SHA-256을 채워서 S256 방식을 쓰게 한다.
const g = globalThis as { crypto?: { getRandomValues?: unknown; subtle?: unknown } };
g.crypto ??= {};
g.crypto.getRandomValues ??= ExpoCrypto.getRandomValues;
g.crypto.subtle ??= {
  digest: (algorithm: string | { name: string }, data: BufferSource) => {
    const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
    if (name.toUpperCase() !== 'SHA-256') throw new Error(`unsupported digest ${name}`);
    return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// .env에 프로젝트가 설정돼 있을 때만 서버 기능(로그인, 함께 챙기기)을 켠다
export const backendEnabled = !!(url && anonKey && !url.includes('xxxxxxxx'));
export const naverEnabled = backendEnabled && process.env.EXPO_PUBLIC_AUTH_NAVER === '1';

export const supabase: SupabaseClient | null = backendEnabled
  ? createClient(url!, anonKey!, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })
  : null;

// 앱이 앞에 있을 때만 토큰을 갱신한다 (Supabase React Native 권장 방식)
if (supabase) {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
