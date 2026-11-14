import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import AppButton from '../../components/AppButton';
import { colors, card, font, spacing } from '../../theme/theme';

export default function AboutScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="About" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.headline} accessibilityRole="header">About F.I.L. Food</Text>
          <Text style={styles.body}>
            F.I.L. Food prepares meals around your health, diet, and goals, with delivery or pickup.
          </Text>
          <Text style={styles.body}>
            Tap Help in the header for step-by-step ordering, FAQs, the app guide, and support contact details.
          </Text>
        </View>
        <AppButton title="Back" variant="outline" onPress={() => navigation.goBack()} color={colors.primary} style={styles.back} />
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
  back: { marginTop: spacing.lg },
});
