import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HelpButton from './HelpButton';
import { colors, font, fonts, spacing, touch, type } from '../theme/theme';

type BackHeaderProps = {
  title: string;
  onBack: () => void;
  subtitle?: string | null;
  /** Text next to the back arrow, e.g. "Account" or "Back to orders". */
  backLabel?: string;
  /** Screen-reader label for the back control when it should differ from the text. */
  backAccessibilityLabel?: string;
  /** Replaces the default Help control. */
  trailing?: ReactNode;
  showHelp?: boolean;
};

/**
 * Design-guide sub-page header: back link and Help pill on one row, then the page title.
 * Shared by BackPageShell and scrolling detail pages so every sub-page looks the same.
 */
function BackHeader({
  title,
  onBack,
  subtitle,
  backLabel = 'Back',
  backAccessibilityLabel,
  trailing,
  showHelp = true,
}: BackHeaderProps) {
  const right = trailing ?? (showHelp ? <HelpButton /> : null);
  return (
    <View style={styles.wrap}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backAccessibilityLabel || (backLabel === 'Back' ? 'Back' : `Back to ${backLabel}`)}
          onPress={onBack}
          hitSlop={6}
          style={({ pressed }) => [styles.backHit, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.backText} allowFontScaling>{backLabel}</Text>
        </Pressable>
        {right ? <View style={styles.trailing}>{right}</View> : null}
      </View>
      <Text style={styles.title} accessibilityRole="header" allowFontScaling>{title}</Text>
      {subtitle ? <Text style={styles.subtitle} allowFontScaling>{subtitle}</Text> : null}
    </View>
  );
}

export default memo(BackHeader);

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
  },
  backHit: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: touch.min,
    minHeight: touch.min,
    paddingRight: spacing.sm,
    marginLeft: -6,
    flexShrink: 1,
  },
  pressed: { opacity: 0.7 },
  trailing: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: spacing.sm },
  backText: { fontFamily: fonts.medium, fontSize: font.body, color: colors.primary, marginLeft: 2, flexShrink: 1 },
  title: { ...type.pageTitle, marginTop: spacing.xs },
  subtitle: { ...type.pageSubtitle, marginTop: 2 },
});
