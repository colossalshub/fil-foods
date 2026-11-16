import { View, Text, Image, StyleSheet } from 'react-native';

declare const require: (id: string) => number;
import { colors, radius, spacing, fonts } from '../theme/theme';

const logo = require('../../../assets/images/fil-foods-logo.png');

/** Brand block from the design guide: plate mark, "F.I.L Foods" and the tagline. */
export default function LogoPlaceholder({ label = 'F.I.L Foods', showTagline = true, size = 'md' }: {
  label?: string;
  showTagline?: boolean;
  size?: 'md' | 'lg';
}) {
  const large = size === 'lg';
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={`${label} logo`}>
      <View style={[styles.markWrap, large && styles.markWrapLg]}>
        <Image source={logo} style={large ? styles.markLg : styles.mark} resizeMode="contain" />
      </View>
      {label ? <Text style={[styles.label, large && styles.labelLg]}>{label}</Text> : null}
      {showTagline ? <Text style={styles.tagline}>Manage. Serve. Nourish.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  markWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markWrapLg: { width: 96, height: 96 },
  mark: { width: 64, height: 64 },
  markLg: { width: 88, height: 88 },
  label: {
    fontFamily: fonts.bold,
    marginTop: spacing.sm,
    fontSize: 24,
    lineHeight: 32,
    color: colors.heading,
  },
  labelLg: { fontSize: 32, lineHeight: 40 },
  tagline: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.primary, marginTop: 2 },
});
