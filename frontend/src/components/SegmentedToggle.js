import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, font, radius, spacing, control } from '../theme/theme';

export default function SegmentedToggle({ label, options, value, onChange }) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={[styles.option, selected && styles.selected]}
            >
              <Text style={[styles.text, selected && styles.selectedText]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontSize: font.md, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  option: {
    flex: 1,
    minHeight: control.minHeight,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  selected: { backgroundColor: colors.primary },
  text: { fontSize: font.md, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  selectedText: { color: colors.white },
});
