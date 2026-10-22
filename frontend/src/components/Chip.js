import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, font, radius } from '../theme/theme';

export default function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.on]}>
      <Text style={[styles.text, active && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontSize: font.sm, color: colors.primary },
});
