import { View, Text, Image, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthHeader from './AuthHeader';
import { colors, font, spacing, card } from '../theme/theme';

export default function AuthLayout({ variant, title, subtitle, onBack, children }) {
  if (variant === 'back') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AuthHeader variant="back" title={title} onBack={onBack} />
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.backScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.card}>{children}</View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Image
            source={require('../../assets/images/fil-foods-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="F.I.L. FOODS logo"
          />
          <Text style={styles.brand}>Food is Life</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
          <View style={styles.card}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backScroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  scroll: { padding: spacing.xl, alignItems: 'center' },
  logo: { width: 88, height: 88, marginTop: spacing.lg },
  brand: { marginTop: spacing.sm, fontSize: font.sm, letterSpacing: 2, color: colors.secondary, fontWeight: '700' },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.primary, marginTop: spacing.md },
  sub: { fontSize: font.sm, color: colors.muted, marginTop: 2, textAlign: 'center' },
  card: { ...card, width: '100%', padding: spacing.lg, marginTop: spacing.lg },
});
