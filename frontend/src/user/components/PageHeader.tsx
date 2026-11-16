import { memo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import HelpButton from './HelpButton';
import { colors, fonts, spacing, type } from '../theme/theme';

type PageHeaderProps = {
  title: string;
  subtitle?: string | null;
  /** Small emphasised line under the subtitle, e.g. "Registered for: Myself" (USR-46). */
  caption?: string | null;
  /** Show the labelled Help control (USR-26). Defaults to true. */
  showHelp?: boolean;
  accessory?: ReactNode;
};

/**
 * Shared page title block used by every signed-in screen so titles, subtitles and the
 * Help control sit in the same place on Home, Meal, Orders, Account and their sub-pages.
 */
function PageHeader({ title, subtitle, caption, showHelp = true, accessory }: PageHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.titles}>
        <Text style={styles.title} accessibilityRole="header" allowFontScaling>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} allowFontScaling>{subtitle}</Text> : null}
        {caption ? <Text style={styles.caption} allowFontScaling>{caption}</Text> : null}
      </View>
      {accessory || showHelp ? (
        <View style={styles.actions}>
          {accessory}
          {showHelp ? <HelpButton /> : null}
        </View>
      ) : null}
    </View>
  );
}

export default memo(PageHeader);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  titles: { flex: 1, minWidth: 0 },
  title: { ...type.pageTitle },
  subtitle: { ...type.pageSubtitle, marginTop: 2 },
  caption: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.primary, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: 2 },
});
