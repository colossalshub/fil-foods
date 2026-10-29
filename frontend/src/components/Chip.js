import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, font, radius, touch } from '../theme/theme';

export default function Chip({ label, active, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} style={[styles.chip, active && styles.on]}>
      <Text style={[styles.text, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touch.min,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontSize: font.body, color: colors.primary },
});
