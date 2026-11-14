import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ORDERS_COPY } from '../data/messages';
import { colors, card, font, radius, spacing } from '../theme/theme';

type ProgressStep = {
  status: string;
  label: string;
  hint?: string;
  reached?: boolean;
  current?: boolean;
};

export default function OrderProgressStepper({
  title = ORDERS_COPY.orderProgress,
  steps,
  cancelled,
}: {
  title?: string;
  steps: ProgressStep[];
  cancelled?: boolean;
}) {
  if (cancelled) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle} accessibilityRole="header">{title}</Text>
        <View style={styles.cancelledRow}>
          <View style={styles.cancelIcon}>
            <Ionicons name="close" size={28} color={colors.white} />
          </View>
          <View style={styles.cancelText}>
            <Text style={styles.cancelTitle}>{ORDERS_COPY.cancelledHeading}</Text>
            <Text style={styles.cancelBody}>{ORDERS_COPY.cancelledBody}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">{title}</Text>
      <View style={styles.steps}>
        {steps.map((step, index) => {
          const done = !!step.reached;
          const active = !!step.current;
          const isLast = index === steps.length - 1;
          return (
            <View key={step.status} style={styles.stepWrap}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    done && styles.dotDone,
                    active && styles.dotActive,
                  ]}
                >
                  {done ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                </View>
                {!isLast ? (
                  <View style={[styles.line, done && styles.lineDone]} />
                ) : null}
              </View>
              <View style={styles.stepBody}>
                <Text style={[styles.stepLabel, (done || active) && styles.stepLabelActive]}>
                  {step.label}
                </Text>
                {active && step.hint ? (
                  <Text style={styles.stepHint}>{step.hint}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...card, padding: spacing.lg },
  cardTitle: {
    fontSize: font.lg,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  steps: { gap: 0 },
  stepWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, minHeight: 56 },
  rail: { alignItems: 'center', width: 28 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotActive: { borderColor: colors.primary },
  line: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: colors.border,
    marginTop: 2,
  },
  lineDone: { backgroundColor: colors.primary },
  stepBody: { flex: 1, paddingBottom: spacing.md },
  stepLabel: { fontSize: font.body, fontWeight: '600', color: colors.muted },
  stepLabelActive: { color: colors.text },
  stepHint: { marginTop: 4, fontSize: font.sm, lineHeight: 22, color: colors.muted },
  cancelledRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cancelIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { flex: 1, gap: 4 },
  cancelTitle: { fontSize: font.body, fontWeight: '800', color: colors.danger },
  cancelBody: { fontSize: font.body, lineHeight: 22, color: colors.muted },
});