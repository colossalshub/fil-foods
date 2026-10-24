import { View, Text, StyleSheet } from 'react-native';
import { GUIDE_STEPS } from '../data/helpContent';
import { colors, card, font, spacing } from '../theme/theme';

export default function AppGuidePanel() {
  return (
    <View>
      {GUIDE_STEPS.map((step, index) => (
        <View key={step.id} style={styles.stepCard} accessibilityRole="text">
          <Text style={styles.stepNum} allowFontScaling>{`${index + 1}. ${step.title}`}</Text>
          <Text style={styles.body} allowFontScaling>{step.description}</Text>
          {step.screenshotLabel ? (
            <View style={styles.shot} accessibilityLabel={step.screenshotLabel}>
              <Text style={styles.shotLabel} allowFontScaling>{step.screenshotLabel}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stepCard: { ...card, padding: spacing.lg, marginBottom: spacing.md },
  stepNum: { fontSize: font.body, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text },
  shot: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    backgroundColor: colors.soft,
  },
  shotLabel: { fontSize: font.sm, color: colors.muted, fontStyle: 'italic' },
});
