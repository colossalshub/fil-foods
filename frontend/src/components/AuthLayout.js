import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, spacing, card } from '../theme/theme';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logo}><Text style={styles.logoText}>F.I.L.</Text></View>
          <Text style={styles.brand}>F.I.L. FOODS</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, alignItems: 'center' },
  logo: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  logoText: { color: colors.white, fontWeight: '800', fontSize: font.lg },
  brand: { marginTop: spacing.sm, fontSize: font.sm, letterSpacing: 2, color: colors.secondary, fontWeight: '700' },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.primary, marginTop: spacing.md },
  sub: { fontSize: font.sm, color: colors.muted, marginTop: 2, textAlign: 'center' },
  card: { ...card, width: '100%', padding: spacing.lg, marginTop: spacing.lg },
});
