import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, fonts, spacing, touch } from '../theme/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * A tappable list row that clearly reads as a button: icon chip, label, optional
 * summary of the current value, chevron, a pressed state (ripple on Android, tint
 * elsewhere) and a touch target of at least 56px. Used for every Account / Profile /
 * Health row so they look and behave the same.
 */
export default function ActionRow({
  icon,
  label,
  summary,
  onPress,
  danger,
  divider = true,
  accessibilityHint,
}: {
  icon?: IconName;
  label: string;
  /** Current value shown under the label, e.g. "Hypertension (HTN)". */
  summary?: string | null;
  onPress: () => void;
  danger?: boolean;
  /** Draw a hairline under the row (off for the last row in a card). */
  divider?: boolean;
  accessibilityHint?: string;
}) {
  const tone = danger ? colors.danger : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={summary ? `${label}, ${summary}` : label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      android_ripple={{ color: colors.mintStrong }}
      style={({ pressed }) => [
        styles.row,
        divider && styles.divider,
        pressed && Platform.OS !== 'android' && styles.pressed,
      ]}
    >
      {icon ? (
        <View style={[styles.iconChip, danger && styles.iconChipDanger]}>
          <Ionicons name={icon} size={20} color={tone} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={[styles.label, danger && styles.labelDanger]} allowFontScaling>{label}</Text>
        {summary ? (
          <Text style={styles.summary} numberOfLines={2} allowFontScaling>{summary}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={danger ? colors.danger : colors.inactive} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Math.max(touch.min, 56),
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.white,
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.soft },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipDanger: { backgroundColor: colors.soft },
  text: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.semibold, fontSize: font.body, lineHeight: 22, color: colors.heading },
  labelDanger: { color: colors.danger },
  summary: { fontFamily: fonts.regular, fontSize: font.sm, lineHeight: 20, color: colors.muted },
});
