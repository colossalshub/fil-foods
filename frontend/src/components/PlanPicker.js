import { useCallback, useState } from 'react';
import {
  View, Text, Pressable, Modal, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from './AppButton';
import FormMessage from './FormMessage';
import {
  PLAN_MSG,
  beginChoosePlan,
  cancelPlanSelection,
  confirmChoosePlan,
  formatPlanDate,
  getPlanDefinition,
  getPlanForUser,
  isCurrentPlanPeriod,
  listPlanPeriods,
  setPendingPlanPeriod,
} from '../services/planService';
import { colors, card, font, radius, spacing, touch } from '../theme/theme';

const PERIOD_LABELS = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export default function PlanPicker({
  user,
  navigation,
  initialPeriod = 'weekly',
  rememberedPeriod,
  onRememberPeriod,
  onPlanUpdated,
  showHeadline = true,
}) {
  const [periodId, setPeriodId] = useState(rememberedPeriod || initialPeriod);
  const [banner, setBanner] = useState([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [successLines, setSuccessLines] = useState([]);

  const planDef = getPlanDefinition(periodId);
  const storedPlan = user?.id ? getPlanForUser(user.id) : null;
  const isVisitor = !user?.id || user.role === 'visitor';
  const isCurrent = user?.id && isCurrentPlanPeriod(user.id, periodId);

  const switchPeriod = useCallback((next) => {
    setPeriodId(next);
    onRememberPeriod?.(next);
    setSuccessLines([]);
    setBanner([]);
  }, [onRememberPeriod]);

  const onChoose = () => {
    setBanner([]);
    setSuccessLines([]);

    if (isVisitor) {
      setPendingPlanPeriod(periodId);
      setBanner([PLAN_MSG.loginRequired]);
      navigation?.getParent?.()?.navigate('Login');
      return;
    }

    const gate = beginChoosePlan(user.id, periodId);
    if (!gate.ok) {
      if (gate.reason === 'profile') {
        navigation?.getParent?.()?.navigate('CompleteProfile');
        return;
      }
      setBanner([gate.message]);
      return;
    }

    setSummary(gate.summary);
    setSummaryOpen(true);
  };

  const onConfirmSummary = () => {
    const result = confirmChoosePlan(user.id, periodId);
    setSummaryOpen(false);
    if (!result.ok) {
      setBanner([result.message]);
      return;
    }
    const lines = [result.message];
    if (result.startDate && result.renewalDate) {
      lines.push(`Start: ${result.startDate}`, `Renewal: ${result.renewalDate}`);
    }
    setSuccessLines(lines);
    onPlanUpdated?.();
  };

  const onCancelSummary = () => {
    cancelPlanSelection();
    setSummaryOpen(false);
    onRememberPeriod?.(periodId);
  };

  if (!planDef) return null;

  return (
    <View>
      {showHeadline ? (
        <>
          <Text style={styles.headline} accessibilityRole="header">{PLAN_MSG.headline}</Text>
          <Text style={styles.sub}>{PLAN_MSG.lockInShort}</Text>
        </>
      ) : null}

      <FormMessage messages={banner} />
      <FormMessage messages={successLines} tone="ok" />

      <View style={styles.periodRow} accessibilityRole="tablist">
        {listPlanPeriods().map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: periodId === item.id }}
            onPress={() => switchPeriod(item.id)}
            style={[styles.periodChip, periodId === item.id && styles.periodChipActive]}
          >
            <Text style={[styles.periodChipText, periodId === item.id && styles.periodChipTextActive]}>
              {PERIOD_LABELS[item.id]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planName}>{planDef.name}</Text>
        <Text style={styles.price}>{planDef.priceLabel}</Text>
        <Text style={styles.tagline}>{planDef.tagline}</Text>
        {planDef.benefits.map((benefit) => (
          <Text key={benefit} style={styles.benefit}>• {benefit}</Text>
        ))}
        {storedPlan?.status === 'active' && storedPlan.pendingPeriodId === periodId ? (
          <Text style={styles.pendingNote}>
            Scheduled to start after your current period.
          </Text>
        ) : null}
        <AppButton
          title={isCurrent ? PLAN_MSG.currentPlan : planDef.chooseLabel}
          onPress={isCurrent ? undefined : onChoose}
          disabled={isCurrent}
          color={colors.action}
          style={styles.chooseBtn}
        />
      </View>

      <Modal visible={summaryOpen} animationType="slide" onRequestClose={onCancelSummary}>
        <SafeAreaView style={styles.modalScreen}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalTitle} accessibilityRole="header">Confirm your plan</Text>
            {summary ? (
              <>
                <Text style={styles.body}>{summary.name}</Text>
                <Text style={styles.body}>{summary.priceLabel}</Text>
                {summary.benefits.map((benefit) => (
                  <Text key={benefit} style={styles.body}>• {benefit}</Text>
                ))}
                {summary.isChange && summary.effectiveDate ? (
                  <Text style={styles.body}>
                    Changes apply on {formatPlanDate(summary.effectiveDate)}.
                  </Text>
                ) : null}
              </>
            ) : null}
            <AppButton title="Confirm" onPress={onConfirmSummary} color={colors.primary} />
            <AppButton title="Cancel" variant="outline" onPress={onCancelSummary} color={colors.primary} style={styles.modalCancel} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { fontSize: font.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  sub: { fontSize: font.body, lineHeight: 24, color: colors.muted, marginBottom: spacing.lg },
  periodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  periodChip: {
    minHeight: touch.min,
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodChipText: { fontSize: font.body, color: colors.text, fontWeight: '600' },
  periodChipTextActive: { color: colors.white },
  planCard: { ...card, padding: spacing.lg, marginBottom: spacing.lg },
  planName: { fontSize: font.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  price: { fontSize: font.body, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  tagline: { fontSize: font.body, lineHeight: 24, color: colors.muted, marginBottom: spacing.md },
  benefit: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.xs },
  pendingNote: { fontSize: font.sm, color: colors.warning, marginTop: spacing.sm, marginBottom: spacing.sm },
  chooseBtn: { marginTop: spacing.md },
  modalScreen: { flex: 1, backgroundColor: colors.background },
  modalScroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  modalTitle: { fontSize: font.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.lg },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.sm },
  modalCancel: { marginTop: spacing.sm },
});
