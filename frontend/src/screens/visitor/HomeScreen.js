import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import AppButton from '../../components/AppButton';
import { clearPendingDestination } from '../../navigation/pendingDestination';
import { colors, card, font, spacing, touch } from '../../theme/theme';

const STEPS = [
  {
    title: 'Create and verify your account',
    line: 'Sign up and confirm your phone or email.',
  },
  {
    title: 'Tell us your health conditions, diet, and allergies',
    line: 'We use this to keep your meals safe and suitable.',
  },
  {
    title: 'Pick your meals, then choose delivery or pickup',
    line: 'Add meals to your order and set when you want them.',
  },
  {
    title: 'Track your order in Orders',
    line: 'Follow status updates until your order is complete.',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Home" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text style={styles.introTitle} accessibilityRole="header">Food is Life</Text>
          <Text style={styles.stepLine}>
            Good, safe food is the foundation of good health at every age. We prepare meals around your health, your diet, and your goals.
          </Text>
        </View>

        <Text style={styles.sectionTitle} accessibilityRole="header">How it works</Text>
        {STEPS.map((step, index) => (
          <View key={step.title} style={styles.stepRow}>
            <View style={styles.stepNumWrap}>
              <Text style={styles.stepNum}>{index + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepLine}>{step.line}</Text>
            </View>
          </View>
        ))}

        <AppButton
          title="Get started"
          onPress={() => {
            clearPendingDestination();
            navigation.getParent()?.navigate('CreateAccount');
          }}
          color={colors.action}
          style={styles.cta}
        />
        <AppButton
          title="Log in"
          variant="outline"
          onPress={() => {
            clearPendingDestination();
            navigation.getParent()?.navigate('Login');
          }}
          color={colors.primary}
        />
        <AppButton
          title="About"
          variant="outline"
          onPress={() => navigation.getParent()?.navigate('About')}
          color={colors.primary}
          style={styles.about}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  intro: { ...card, padding: spacing.lg, marginBottom: spacing.xl },
  introTitle: { fontSize: font.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  sectionTitle: { fontSize: font.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.lg, minHeight: touch.min },
  stepNumWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepNum: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: font.body, lineHeight: 24, color: colors.text, fontWeight: '700' },
  stepLine: { fontSize: font.body, lineHeight: 24, color: colors.muted, marginTop: 2 },
  cta: { marginTop: spacing.xl, marginBottom: spacing.sm },
  about: { marginTop: spacing.sm },
});
