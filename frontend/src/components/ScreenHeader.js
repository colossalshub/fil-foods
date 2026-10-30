import { View, Text, Image, StyleSheet } from 'react-native';
import HelpButton from './HelpButton';
import NotificationBell from './NotificationBell';
import { colors, font, spacing } from '../theme/theme';

const logo = require('../../assets/images/fil-foods-logo.png');

export default function ScreenHeader({ title, subtitle, accessory, showBell = false }) {
  return (
    <View style={styles.wrap}>
      <Image
        source={logo}
        style={styles.logo}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="F.I.L. FOODS logo"
      />
      <View style={styles.titles}>
        <Text style={styles.title} allowFontScaling>{title}</Text>
        {subtitle ? <Text style={styles.sub} allowFontScaling>{subtitle}</Text> : null}
      </View>
      <View style={styles.actions}>
        {showBell ? <NotificationBell /> : null}
        {accessory || null}
        <HelpButton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  logo: { width: 44, height: 44 },
  titles: { flex: 1, paddingRight: spacing.sm },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text, letterSpacing: -0.4 },
  sub: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center' },
});
