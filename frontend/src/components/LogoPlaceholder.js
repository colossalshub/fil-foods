import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, font, spacing } from '../theme/theme';

/**
 * Reserved brand area. Replace the mark inside this component with the official
 * F.I.L. FOODS logo later. Screens should not draw their own logo.
 */
export default function LogoPlaceholder({ label = 'F.I.L. FOODS' }) {
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="F.I.L. FOODS logo">
      <Image source={require('../../assets/images/fil-foods-logo.png')} style={styles.mark} resizeMode="contain" />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  mark: {
    width: 56,
    height: 56,
  },
  label: {
    marginTop: spacing.sm,
    fontSize: font.body,
    letterSpacing: 1.2,
    fontWeight: '700',
    color: colors.primary,
  },
});
