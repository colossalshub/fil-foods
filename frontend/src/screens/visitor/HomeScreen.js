import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import AppButton from '../../components/AppButton';
import { useAuth } from '../../context/AuthContext';
import { colors, card, font, spacing, touch } from '../../theme/theme';

const DRAFT_INTRO =
  'Food is Life. Good, safe food is the foundation of good health at every age. We prepare meals around your health, your diet, and your goals, so every meal supports your well-being.';

const STEPS = [
  'Create and verify your account',
  'Tell us your health conditions, diet, and allergies',
  'Choose a plan',
  'Pick your meals, then choose delivery or pickup',
  'Track your order until it arrives',
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const greeting = user?.firstName ? `Hello, ${user.firstName}.` : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Home" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {greeting ? <Text style={styles.greeting}>{greeting}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.draftLabel}>Draft</Text>
          <Text style={styles.body}>{DRAFT_INTRO}</Text>
          <Text style={styles.body}>
            Enjoy customized, dietitian-approved meals with delivery or pickup options that fit your routine.
          </Text>
        </View>

        <Text style={styles.sectionTitle} accessibilityRole="header">How it works</Text>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <Text style={styles.stepNum}>{index + 1}</Text>
            {index === 2 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate('Plans')}
                style={styles.stepPress}
              >
                <Text style={styles.stepLink}>{step}</Text>
              </Pressable>
            ) : (
              <Text style={styles.body}>{step}</Text>
            )}
          </View>
        ))}

        <AppButton
          title="Get started"
          onPress={() => navigation.getParent()?.navigate('CreateAccount')}
          color={colors.action}
          style={styles.cta}
        />
        <AppButton
          title="Log in"
          variant="outline"
          onPress={() => navigation.getParent()?.navigate('Login')}
          color={colors.primary}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  greeting: { fontSize: font.body, lineHeight: 24, color: colors.primary, fontWeight: '700', marginBottom: spacing.md },
  card: { ...card, padding: spacing.lg, marginBottom: spacing.xl },
  draftLabel: { fontSize: font.sm, color: colors.muted, fontWeight: '700', marginBottom: spacing.sm, textTransform: 'uppercase' },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text, flex: 1 },
  sectionTitle: { fontSize: font.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md, minHeight: touch.min },
  stepNum: { width: 28, fontSize: font.body, fontWeight: '700', color: colors.action, lineHeight: 24 },
  stepPress: { flex: 1, minHeight: touch.min, justifyContent: 'center' },
  stepLink: { fontSize: font.body, lineHeight: 24, color: colors.action, fontWeight: '700', textDecorationLine: 'underline' },
  cta: { marginTop: spacing.xl, marginBottom: spacing.sm },
});
