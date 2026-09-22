import { useMemo } from 'react';
import { useColorScheme, StyleSheet } from 'react-native';
import { usePreferencesStore } from '../stores/preferencesStore';
import { ColorTokens, darkColors, lightColors } from './tokens';

export * from './tokens';

export const useIsDark = () => {
  const system = useColorScheme();
  const mode = usePreferencesStore(s => s.themeMode);
  return mode === 'system' ? system === 'dark' : mode === 'dark';
};

export const useColors = (): ColorTokens => (useIsDark() ? darkColors : lightColors);

// 화면마다 색 토큰을 받아 스타일을 만든다. 테마가 바뀔 때만 다시 만든다.
export const makeStyles = <T extends StyleSheet.NamedStyles<T>>(factory: (c: ColorTokens) => T) => {
  const cache = new Map<ColorTokens, T>();
  return (): T => {
    const c = useColors();
    return useMemo(() => {
      let styles = cache.get(c);
      if (!styles) {
        styles = StyleSheet.create(factory(c));
        cache.set(c, styles);
      }
      return styles;
    }, [c]);
  };
};
