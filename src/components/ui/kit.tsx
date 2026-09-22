import React, { useEffect, useRef } from 'react';
import {
  Animated, KeyboardAvoidingView, Modal, Platform, Pressable, PressableProps, ScrollView,
  StyleProp, Text, TextInput, TextInputProps, TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { fonts, makeStyles, radius, typography, useColors } from '../../theme';
import { Icon, IconName } from './Icon';

// ───────────── 글자 ─────────────

type Variant = keyof typeof typography;
type Tone = 'text1' | 'text2' | 'text3' | 'accent' | 'accentStrong' | 'onAccent' | 'placeholder' | 'danger' | 'onChipOn';
type Weight = keyof typeof fonts;

interface TProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: Weight;
  size?: number;
  center?: boolean;
}

export const T = ({ variant = 'body2', tone = 'text1', weight, size, center, style, ...rest }: TProps) => {
  const c = useColors();
  const base = typography[variant];
  return (
    <Text
      {...rest}
      style={[
        base,
        { color: c[tone] },
        weight && { fontFamily: fonts[weight] },
        size != null && { fontSize: size, lineHeight: Math.round(size * 1.4) },
        center && { textAlign: 'center' },
        style,
      ]}
    />
  );
};

// ───────────── 누르는 영역 ─────────────

interface TapProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  pressedOpacity?: number;
}

export const Tap = ({ style, pressedOpacity = 0.6, ...rest }: TapProps) => (
  <Pressable {...rest} style={({ pressed }) => [style, pressed && { opacity: pressedOpacity }]} />
);

// ───────────── 버튼 ─────────────

interface ButtonProps {
  label: string;
  onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: IconName;
}

export const Button = ({ label, onPress, kind = 'primary', disabled, style, icon }: ButtonProps) => {
  const s = useKitStyles();
  const c = useColors();
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' || kind === 'dangerGhost' ? c.danger : kind === 'ghost' ? c.text2 : c.text1;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        kind === 'primary' && s.buttonPrimary,
        kind === 'secondary' && s.buttonSecondary,
        kind === 'danger' && s.buttonSecondary,
        (kind === 'ghost' || kind === 'dangerGhost') && s.buttonGhost,
        disabled && s.buttonDisabled,
        style,
      ]}
    >
      {icon && <Icon name={icon} size={20} color={fg} strokeWidth={2} />}
      <T variant="title3" weight={kind === 'primary' ? 'bold' : 'semibold'} style={{ color: fg }}>{label}</T>
    </Tap>
  );
};

// 화면 아래에 붙는 버튼 (토스 BottomCTA 패턴)
export const BottomCTA = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => {
  const s = useKitStyles();
  const insets = useSafeAreaInsets();
  return <View style={[s.bottomCTA, { paddingBottom: Math.max(insets.bottom, 12) + 8 }, style]}>{children}</View>;
};

// 떠 있는 '새 리스트' 버튼
export const FAB = ({ label, onPress, bottom }: { label: string; onPress: () => void; bottom: number }) => {
  const s = useKitStyles();
  const c = useColors();
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={[s.fab, { bottom }]}>
      <Icon name="plus" size={22} color={c.onAccent} strokeWidth={2.2} />
      <T size={16} weight="bold" tone="onAccent">{label}</T>
    </Tap>
  );
};

// 원형 아이콘 버튼 (± 등)
export const RoundButton = ({ icon, onPress, size = 56, disabled, label }: {
  icon: IconName; onPress: () => void; size?: number; disabled?: boolean; label: string;
}) => {
  const s = useKitStyles();
  const c = useColors();
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[s.round, { width: size, height: size, borderRadius: size / 2 }, disabled && { opacity: 0.4 }]}
    >
      <Icon name={icon} size={size > 48 ? 24 : 20} color={c.text1} strokeWidth={2.2} />
    </Tap>
  );
};

// 상단 바의 48px 아이콘 버튼
export const IconButton = ({ icon, onPress, label, color, size = 22 }: {
  icon: IconName; onPress: () => void; label: string; color?: string; size?: number;
}) => (
  <Tap accessibilityRole="button" accessibilityLabel={label} hitSlop={4} onPress={onPress}
    style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
    <Icon name={icon} size={size} color={color} strokeWidth={icon === 'back' ? 2 : 1.8} />
  </Tap>
);

// ───────────── 칩 ─────────────

export const Chip = ({ label, selected, onPress, disabled, small }: {
  label: string; selected?: boolean; onPress?: () => void; disabled?: boolean; small?: boolean;
}) => {
  const s = useKitStyles();
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.chip, small && { paddingHorizontal: 12 }, selected && s.chipOn, disabled && s.chipDisabled]}
    >
      <T size={14} weight={selected ? 'semibold' : 'medium'} tone={selected ? 'onChipOn' : disabled ? 'placeholder' : 'text2'}>
        {label}
      </T>
    </Tap>
  );
};

export const ChipRow = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled"
    contentContainerStyle={[{ gap: 8 }, style]}>
    {children}
  </ScrollView>
);

// ───────────── 체크박스 ─────────────

export const Checkbox = ({ checked, size = 24 }: { checked: boolean; size?: number }) => {
  const c = useColors();
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (checked) {
      scale.setValue(0.7);
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }).start();
    }
  }, [checked]);
  return (
    <Animated.View
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: checked ? c.accent : 'transparent',
        borderWidth: checked ? 0 : 2, borderColor: c.control,
        transform: [{ scale }],
      }}
    >
      {checked && <Icon name="check" size={size * 0.67} color={c.onAccent} strokeWidth={3} />}
    </Animated.View>
  );
};

export const haptic = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  select: () => Haptics.selectionAsync().catch(() => {}),
};

// ───────────── 진행률 ─────────────

export const ProgressBar = ({ ratio, height = 8, style }: { ratio: number; height?: number; style?: StyleProp<ViewStyle> }) => {
  const c = useColors();
  const width = useRef(new Animated.Value(ratio)).current;
  useEffect(() => {
    Animated.timing(width, { toValue: ratio, duration: 250, useNativeDriver: false }).start();
  }, [ratio]);
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: c.track, overflow: 'hidden' }, style]}>
      <Animated.View
        style={{
          height, borderRadius: height / 2, backgroundColor: c.accent,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
};

// ───────────── 토글 ─────────────

export const Toggle = ({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) => {
  const c = useColors();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: true }).start();
  }, [value]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={10}
      onPress={() => { haptic.select(); onChange(!value); }}
      style={{ width: 48, height: 28, borderRadius: 14, padding: 3, backgroundColor: value ? c.accent : c.control }}
    >
      <Animated.View
        style={{
          width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF',
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
        }}
      />
    </Pressable>
  );
};

// ───────────── 입력 ─────────────

export const SearchField = React.forwardRef<TextInput, TextInputProps & { style?: StyleProp<ViewStyle> }>(
  ({ style, ...rest }, ref) => {
    const s = useKitStyles();
    const c = useColors();
    return (
      <View style={[s.search, style]}>
        <Icon name="search" size={20} color={c.text3} strokeWidth={2} />
        <TextInput
          ref={ref}
          placeholderTextColor={c.placeholder}
          returnKeyType="search"
          {...rest}
          style={s.searchInput}
        />
        {!!rest.value && (
          <IconButton icon="close" label="검색어 지우기" size={18} color={c.text3} onPress={() => rest.onChangeText?.('')} />
        )}
      </View>
    );
  },
);

export const Field = React.forwardRef<TextInput, TextInputProps & { label?: string }>(({ label, style, ...rest }, ref) => {
  const s = useKitStyles();
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      {label && <T size={14} weight="semibold" tone="text2">{label}</T>}
      <TextInput ref={ref} placeholderTextColor={c.placeholder} {...rest} style={[s.field, style as TextStyle]} />
    </View>
  );
});

// ───────────── 상단 ─────────────

export const TopBar = ({ onBack, right, title }: { onBack?: () => void; right?: React.ReactNode; title?: string }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top }}>
      <View style={{ height: 56, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack ? <IconButton icon="back" label="뒤로" size={24} onPress={onBack} /> : <View style={{ width: 48 }} />}
        {title ? <T variant="title3" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{title}</T> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', minWidth: 48, justifyContent: 'flex-end' }}>{right}</View>
      </View>
    </View>
  );
};

// 만들기 흐름: 뒤로 + 'n / m' + 진행 바 + 질문
export const StepHeader = ({ step, total, onBack, title, subtitle, closeIcon }: {
  step: number; total: number; onBack: () => void; title: string; subtitle?: string; closeIcon?: boolean;
}) => {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top }}>
      <View style={{ height: 56, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconButton icon={closeIcon ? 'close' : 'back'} label={closeIcon ? '닫기' : '뒤로'} size={24} onPress={onBack} />
        <T size={14} weight="medium" tone="text3" style={{ paddingRight: 16 }}>{step} / {total}</T>
      </View>
      <View style={{ marginHorizontal: 20, height: 4, borderRadius: 2, backgroundColor: c.track }}>
        <View style={{ width: `${(step / total) * 100}%`, height: 4, borderRadius: 2, backgroundColor: c.accent }} />
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <T variant="title1">{title}</T>
        {subtitle && <T variant="body2" tone="text2" style={{ marginTop: 8 }}>{subtitle}</T>}
      </View>
    </View>
  );
};

// ───────────── 시트 ─────────────

export const Sheet = ({ visible, onClose, children, title }: {
  visible: boolean; onClose: () => void; children: React.ReactNode; title?: string;
}) => {
  const s = useKitStyles();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <Pressable style={s.overlay} onPress={onClose} accessibilityLabel="닫기" />
        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={s.handle} />
          {title && <T variant="title2" style={{ marginTop: 8, marginBottom: 12 }}>{title}</T>}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// 시트 안 선택 행
export const SheetRow = ({ icon, label, sub, onPress, danger }: {
  icon: IconName; label: string; sub?: string; onPress: () => void; danger?: boolean;
}) => {
  const c = useColors();
  return (
    <Tap accessibilityRole="button" onPress={onPress}
      style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={22} color={danger ? c.danger : c.text1} />
      </View>
      <View style={{ flex: 1 }}>
        <T variant="body1" weight="semibold" tone={danger ? 'danger' : 'text1'}>{label}</T>
        {sub && <T variant="caption" tone="text3">{sub}</T>}
      </View>
    </Tap>
  );
};

const useKitStyles = makeStyles(c => ({
  button: {
    height: 56, borderRadius: radius.button, flexDirection: 'row', gap: 6,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16,
  },
  buttonPrimary: { backgroundColor: c.accentStrong },
  buttonSecondary: { backgroundColor: c.fill },
  buttonGhost: { height: 48, alignSelf: 'center', backgroundColor: 'transparent' },
  buttonDisabled: { opacity: 0.4 },
  bottomCTA: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: c.bg },
  fab: {
    position: 'absolute', right: 16, height: 56, paddingLeft: 18, paddingRight: 22, borderRadius: 28,
    backgroundColor: c.accentStrong, flexDirection: 'row', alignItems: 'center', gap: 8,
    elevation: 6, shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  round: { backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
  chip: { height: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: c.fill, justifyContent: 'center' },
  chipOn: { backgroundColor: c.chipOn },
  chipDisabled: { backgroundColor: c.fillSubtle },
  search: {
    height: 52, borderRadius: radius.input, backgroundColor: c.fill,
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 2,
  },
  searchInput: { flex: 1, height: 52, fontSize: 16, fontFamily: fonts.regular, color: c.text1, padding: 0 },
  field: {
    minHeight: 52, borderRadius: radius.input, backgroundColor: c.fill, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, fontFamily: fonts.regular, color: c.text1,
  },
  overlay: { flex: 1, backgroundColor: c.overlay },
  sheet: {
    backgroundColor: c.bg, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20, paddingTop: 8, gap: 4,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.handle, marginBottom: 8 },
}));
