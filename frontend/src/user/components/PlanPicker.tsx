import { useCallback, useState } from 'react';
import type { AuthUser } from '../types';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppModal from './AppModal';
import AppButton from './AppButton';
import BackPageShell from './BackPageShell';
import FormMessage from './FormMessage';
import {
  PLAN_MSG,
  beginChoosePlan,
  cancelPlanSelection,
  confirmCancelPlan,
  formatPlanDate,
  getPlanDefinition,
  getPlanForUser,
  isCurrentPlanPeriod,
  listPlanPeriods,
  requestCancelPlan,
  setPendingPlanPeriod,
} from '../services/planService';
import { colors, card, font, radius, spacing, touch, fonts } from '../theme/theme';

const PERIOD_LABELS: Record<string, string> = {
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
}: {
  user: AuthUser | null;
  navigation?: {
    navigate: (name: string, params?: object) => void;
    getParent?: () => { navigate: (name: string, params?: object) => void } | undefined;
  };
  initialPeriod?: string;
  rememberedPeriod?: string | null;
  onRememberPeriod?: (periodId: string) => void;
  onPlanUpdated?: () => void;
  showHeadline?: boolean;
}) {
  const [periodId, setPeriodId] = useState(rememberedPeriod || initialPeriod);
  const [banner, setBanner] = useState<string[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState<{
    name?: string;
    priceLabel?: string;
    periodLabel?: string;
    benefits?: string[];
    isChange?: boolean;
    effectiveDate?: string | null;
  } | null>(null);
  const [successLines, setSuccessLines] = useState<string[]>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');

  const planDef = getPlanDefinition(periodId);
  const storedPlan = user?.id ? getPlanForUser(user.id) : null;
  const isVisitor = !user?.id || user.role === 'visitor';
  const isCurrent = user?.id && isCurrentPlanPeriod(user.id, periodId);

  const switchPeriod = useCallback((next: string) => {
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

    const gate = beginChoosePlan(user!.id || '', periodId);
    if (!gate.ok) {
      if (gate.reason === 'profile') {
        navigation?.getParent?.()?.navigate('CompleteProfile');
        return;
      }
      setBanner([gate.message || '']);
      return;
    }

    setSummary(gate.summary || null);
    setSummaryOpen(true);
  };

  const onConfirmSummary = () => {
    setSummaryOpen(false);
    navigation?.navigate('PlanPayment', { periodId });
  };

  const onAskCancel = () => {
    if (!user?.id) return;
    const prompt = requestCancelPlan(user.id);
    if (!prompt.ok || !prompt.message) return;
    setCancelMessage(prompt.message);
    setCancelOpen(true);
  };

  const onConfirmCancel = () => {
    if (!user?.id) return;
    const result = confirmCancelPlan(user.id);
    setCancelOpen(false);
    if (!result.ok || !result.message) return;
    setSuccessLines([result.message]);
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
          <View key={benefit} style={styles.benefitRow}>
            <Ionicons name="checkmark" size={16} color={colors.white} />
            <Text style={styles.benefit}>{benefit}</Text>
          </View>
        ))}
        {storedPlan?.status === 'active' && storedPlan.pendingPeriodId === periodId ? (
          <Text style={styles.pendingNote}>
            Scheduled to start after your current period.
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !!isCurrent }}
          disabled={!!isCurrent}
          onPress={isCurrent ? undefined : onChoose}
          style={[styles.chooseBtn, !!isCurrent && styles.chooseBtnDisabled]}
        >
          <Text style={styles.chooseLabel}>{isCurrent ? PLAN_MSG.currentPlan : planDef.chooseLabel}</Text>
        </Pressable>
        {storedPlan?.status === 'active' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel plan" onPress={onAskCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelLabel}>Cancel plan</Text>
          </Pressable>
        ) : null}
      </View>

      <AppModal visible={summaryOpen} animationType="slide" onRequestClose={onCancelSummary} onCloseAll={onCancelSummary}>
        <BackPageShell
          title="Confirm your plan"
          onBack={onCancelSummary}
          edges={['top', 'bottom']}
          footer={(
            <>
              <AppButton title="Confirm" onPress={onConfirmSummary} color={colors.primary} />
              <AppButton title="Cancel" variant="outline" onPress={onCancelSummary} color={colors.primary} style={styles.modalCancel} />
            </>
          )}
        >
          {summary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.body}>{summary.name}</Text>
              <Text style={styles.body}>{summary.priceLabel}</Text>
              {(summary.benefits || []).map((benefit) => (
                <Text key={benefit} style={styles.body}>• {benefit}</Text>
              ))}
              {summary.isChange && summary.effectiveDate ? (
                <Text style={styles.body}>
                  Changes apply on {formatPlanDate(summary.effectiveDate)}.
                </Text>
              ) : null}
            </View>
          ) : null}
        </BackPageShell>
      </AppModal>

      <AppModal visible={cancelOpen} animationType="slide" onRequestClose={() => setCancelOpen(false)} onCloseAll={() => setCancelOpen(false)}>
        <BackPageShell
          title="Cancel plan"
          onBack={() => setCancelOpen(false)}
          edges={['top', 'bottom']}
          footer={(
            <>
              <AppButton title="Cancel plan" onPress={onConfirmCancel} color={colors.primary} />
              <AppButton title="Keep plan" variant="outline" onPress={() => setCancelOpen(false)} color={colors.primary} style={styles.modalCancel} />
            </>
          )}
        >
          <Text style={styles.body}>{cancelMessage}</Text>
        </BackPageShell>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { fontFamily: fonts.bold, fontSize: font.xl, color: colors.primary, marginBottom: spacing.sm },
  sub: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.muted, marginBottom: spacing.lg },
  periodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  periodChip: {
    minHeight: touch.min,
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodChipText: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.primary },
  periodChipTextActive: { color: colors.white },
  planCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  planName: { fontFamily: fonts.bold, fontSize: font.lg, lineHeight: 26, color: colors.white },
  price: { fontFamily: fonts.bold, fontSize: font.xl, lineHeight: 30, color: colors.white },
  tagline: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.white },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  benefit: { flex: 1, fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.white },
  pendingNote: { fontFamily: fonts.regular, fontSize: font.sm, lineHeight: 20, color: colors.white },
  chooseBtn: {
    minHeight: touch.min,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  chooseBtnDisabled: { opacity: 0.7 },
  chooseLabel: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.primary },
  cancelBtn: {
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.white, textDecorationLine: 'underline' },
  summaryCard: { ...card, padding: spacing.lg, marginBottom: spacing.md },
  body: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.sm },
  modalCancel: { marginTop: spacing.sm },
});
