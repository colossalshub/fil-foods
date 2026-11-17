import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

/**
 * Staff screens use the same Poppins families as the user module (loaded once in App.tsx).
 * Each Poppins weight is its own font family, so `fontWeight` is mapped to a family here and
 * the screens can keep writing `fontWeight: '700'`.
 */
const FAMILY: Record<string, string> = {
  '100': 'Poppins_400Regular',
  '200': 'Poppins_400Regular',
  '300': 'Poppins_400Regular',
  '400': 'Poppins_400Regular',
  normal: 'Poppins_400Regular',
  '500': 'Poppins_500Medium',
  '600': 'Poppins_600SemiBold',
  '700': 'Poppins_700Bold',
  bold: 'Poppins_700Bold',
  '800': 'Poppins_700Bold',
  '900': 'Poppins_700Bold',
};

export function poppins(style: TextProps['style']): TextStyle {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  if (flat.fontFamily) return flat;
  const weight = String(flat.fontWeight ?? '400');
  const { fontWeight: _ignored, ...rest } = flat;
  return { ...rest, fontFamily: FAMILY[weight] ?? FAMILY['400'] };
}

// React 19 passes `ref` as a normal prop, so it flows through `...props`.
export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={poppins(style)} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput {...props} style={poppins(style)} />;
}
