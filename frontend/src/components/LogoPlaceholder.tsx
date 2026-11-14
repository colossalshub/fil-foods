import { View, Text, Image, StyleSheet } from 'react-native';

declare const require: (id: string) => number;
import { colors, font, radius, spacing } from '../theme/theme';

export default function LogoPlaceholder({ label = 'F.I.L Foods', showTagline = true }: {
  label?: string;
  showTagline?: boolean;
}) {
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel={`${label} logo`}>
      <View style={styles.markWrap}>
        <Image source={require('../../assets/images/fil-foods-logo.png')} style={styles.mark} resizeMode="contain" />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {showTagline ? <Text style={styles.tagline}>Manage. Serve. Nourish.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  markWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 40,
    height: 40,
  },
  label: {
    marginTop: spacing.xs,
    fontSize: font.body,
    fontWeight: '700',
    color: colors.deep,
  },
  tagline: { fontSize: font.xs, color: colors.secondary, marginTop: 2 },
});
