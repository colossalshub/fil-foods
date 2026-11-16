import { memo } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { openHelp } from '../navigation/openHelp';
import { colors, font, fonts, radius } from '../theme/theme';

/** Labelled Help pill from the design guide (USR-26: Help is reachable on every screen). */
function HelpButton({ color = colors.primary }: { color?: string }) {
  const navigation = useNavigation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Help"
      accessibilityHint="Opens help, the FAQ and the app guide"
      hitSlop={4}
      onPress={() => openHelp(navigation)}
      style={({ pressed }) => [
        styles.pill,
        { borderColor: color },
        color === colors.white && styles.onDark,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="help-circle-outline" size={20} color={color} />
      <Text style={[styles.label, { color }]} allowFontScaling>Help</Text>
    </Pressable>
  );
}

export default memo(HelpButton);

const styles = StyleSheet.create({
  pill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  onDark: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.75 },
  label: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 22 },
});
