import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/ScreenHeader';
import { PLAN_MSG } from '../../services/planService';
import { colors, card, font, spacing } from '../../theme/theme';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="About" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.headline} accessibilityRole="header">{PLAN_MSG.headline}</Text>
          <Text style={styles.body}>{PLAN_MSG.lockInAbout}</Text>
          <Text style={styles.body}>
            Tap Help in the header for step-by-step ordering, FAQs, the app guide, and support contact details.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  card: { ...card, padding: spacing.lg },
  headline: { fontSize: font.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.md },
});
