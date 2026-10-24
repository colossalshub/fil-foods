import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HelpButton from './HelpButton';
import { colors, font, radius, spacing } from '../theme/theme';

export default function AuthHeader({ variant = 'login', title, onBack }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }, variant === 'login' && styles.loginHeader]}>
      {variant === 'back' ? (
        <View style={styles.bar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.back}>
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={styles.barTitle} accessibilityRole="header">{title}</Text>
          <HelpButton color={colors.white} />
        </View>
      ) : (
        <View style={styles.login}>
          <View style={styles.loginTools}>
            <HelpButton color={colors.white} />
          </View>
          <View
            accessibilityRole="image"
            accessibilityLabel="Meal photo placeholder"
            style={styles.plate}
          >
            <Ionicons name="image-outline" size={28} color={colors.primary} />
            <Text style={styles.plateText}>Photo</Text>
          </View>
          <Text style={styles.brand} accessibilityRole="header">Food is Life</Text>
          <Text style={styles.tagline}>Healthy meals, made with care.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  loginHeader: { paddingBottom: spacing.xxl },
  bar: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 8 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 6,
  },
  backText: { color: colors.primary, fontSize: font.md, fontWeight: '700' },
  barTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.white,
    fontSize: font.xl,
    fontWeight: '700',
  },
  login: { alignItems: 'center' },
  loginTools: { alignSelf: 'flex-end' },
  plate: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  plateText: { color: colors.primary, fontSize: font.sm, fontWeight: '700', marginTop: 2 },
  brand: { color: colors.white, fontSize: font.title, fontWeight: '700', marginTop: spacing.lg },
  tagline: { color: colors.white, fontSize: font.md, marginTop: 4, textAlign: 'center' },
});
