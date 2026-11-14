import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { GUIDE_STEPS, type GuideStepId } from '../data/helpContent';
import { GUIDE_COPY } from '../data/messages';
import AppButton from './AppButton';
import GuideStepReference from './GuideStepReference';
import { colors, card, font, radius, spacing, touch } from '../theme/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const STEP_ICONS: Record<GuideStepId, IoniconName> = {
  menu: 'restaurant-outline',
  order: 'bag-outline',
  tracking: 'car-outline',
  profile: 'person-outline',
  help: 'help-circle-outline',
};

export type GuideFlowPhase = 'welcome' | 'steps';

function ProgressSegments({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.segments} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: current }}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={String(index)}
          style={[styles.segment, index < current && styles.segmentFilled]}
        />
      ))}
    </View>
  );
}

function WelcomeOverview() {
  return (
    <View style={styles.welcomeCard}>
      {GUIDE_STEPS.map((step, index) => (
        <View
          key={step.id}
          style={[styles.overviewRow, index < GUIDE_STEPS.length - 1 && styles.overviewRowBorder]}
        >
          <View style={styles.iconCircle} accessibilityElementsHidden>
            <Ionicons name={STEP_ICONS[step.id]} size={20} color={colors.primary} />
          </View>
          <View style={styles.overviewText}>
            <Text style={styles.overviewTitle} allowFontScaling>{step.overviewTitle}</Text>
            <Text style={styles.overviewBlurb} allowFontScaling>{step.overviewBlurb}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function GuideStepView({
  stepIndex,
  onBack,
  onNext,
  onSkip,
  showBack,
}: {
  stepIndex: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  showBack: boolean;
}) {
  const step = GUIDE_STEPS[stepIndex];
  const total = GUIDE_STEPS.length;
  const current = stepIndex + 1;
  return (
    <View>
      <Text style={styles.stepCount} allowFontScaling>{GUIDE_COPY.stepOf(current, total)}</Text>
      <ProgressSegments current={current} total={total} />
      <View style={styles.stepCard}>
        <GuideStepReference stepId={step.id} caption={step.overviewTitle} />
      </View>
      <Text style={styles.stepTitle} allowFontScaling accessibilityRole="header">
        {step.title}
      </Text>
      <Text style={styles.stepBody} allowFontScaling>{step.description}</Text>
      <View style={styles.navRow}>
        {showBack ? (
          <AppButton
            title={GUIDE_COPY.back}
            variant="outline"
            color={colors.primary}
            onPress={onBack}
            style={styles.navBtn}
          />
        ) : (
          <View style={styles.navSpacer} />
        )}
        <AppButton title={GUIDE_COPY.next} onPress={onNext} style={styles.navBtn} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={GUIDE_COPY.skipGuide}
        onPress={onSkip}
        style={styles.skipHit}
      >
        <Text style={styles.skipText} allowFontScaling>{GUIDE_COPY.skipGuide}</Text>
      </Pressable>
    </View>
  );
}

/** Tap-to-replay list for the Help screen (Figma app guide directory). */
export function GuideReplayList({
  onSelectStep,
  onStartFromBeginning,
  style,
}: {
  onSelectStep: (index: number) => void;
  onStartFromBeginning: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <Text style={styles.replayLead} allowFontScaling>{GUIDE_COPY.replayLead}</Text>
      <View style={styles.welcomeCard}>
        {GUIDE_STEPS.map((step, index) => (
          <Pressable
            key={step.id}
            accessibilityRole="button"
            accessibilityLabel={`${step.overviewTitle}. ${step.overviewBlurb}`}
            onPress={() => onSelectStep(index)}
            style={({ pressed }) => [
              styles.replayRow,
              index < GUIDE_STEPS.length - 1 && styles.overviewRowBorder,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.iconCircle} accessibilityElementsHidden>
              <Ionicons name={STEP_ICONS[step.id]} size={20} color={colors.primary} />
            </View>
            <View style={styles.overviewText}>
              <Text style={styles.overviewTitle} allowFontScaling>{step.overviewTitle}</Text>
              <Text style={styles.overviewBlurb} allowFontScaling>{step.overviewBlurb}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} accessibilityElementsHidden />
          </Pressable>
        ))}
      </View>
      <AppButton title={GUIDE_COPY.startFromBeginning} onPress={onStartFromBeginning} />
    </View>
  );
}

export default function AppGuideExperience({
  initialPhase = 'welcome',
  initialStepIndex = 0,
  onComplete,
  onDismiss,
  welcomeHeader = true,
}: {
  initialPhase?: GuideFlowPhase;
  initialStepIndex?: number;
  onComplete?: () => void;
  onDismiss?: () => void;
  welcomeHeader?: boolean;
}) {
  const [phase, setPhase] = useState<GuideFlowPhase>(initialPhase);
  const [stepIndex, setStepIndex] = useState(initialStepIndex);

  const finish = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  const skip = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  const goNext = useCallback(() => {
    if (stepIndex >= GUIDE_STEPS.length - 1) {
      finish();
      return;
    }
    setStepIndex((value) => value + 1);
  }, [finish, stepIndex]);

  const goBack = useCallback(() => {
    setStepIndex((value) => Math.max(0, value - 1));
  }, []);

  const startGuide = useCallback(() => {
    setStepIndex(0);
    setPhase('steps');
  }, []);

  const welcome = useMemo(() => phase === 'welcome', [phase]);

  if (welcome) {
    return (
      <View>
        {welcomeHeader ? (
          <>
            <Text style={styles.welcomeTitle} accessibilityRole="header" allowFontScaling>
              {GUIDE_COPY.welcomeTitle}
            </Text>
            <Text style={styles.welcomeLead} allowFontScaling>{GUIDE_COPY.welcomeLead}</Text>
          </>
        ) : null}
        <WelcomeOverview />
        <AppButton title={GUIDE_COPY.startGuide} onPress={startGuide} style={styles.ctaGap} />
        <AppButton
          title={GUIDE_COPY.skipForNow}
          variant="outline"
          color={colors.primary}
          onPress={skip}
        />
      </View>
    );
  }

  return (
    <GuideStepView
      stepIndex={stepIndex}
      onBack={goBack}
      onNext={goNext}
      onSkip={skip}
      showBack={stepIndex > 0}
    />
  );
}

const styles = StyleSheet.create({
  welcomeTitle: {
    fontSize: font.title,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  welcomeLead: {
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  welcomeCard: { ...card, paddingVertical: spacing.sm, marginBottom: spacing.lg },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  overviewRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  replayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    minHeight: touch.min,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewText: { flex: 1 },
  overviewTitle: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  overviewBlurb: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  ctaGap: { marginBottom: spacing.md },
  stepCount: {
    fontSize: font.sm,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  segments: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.lg },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  segmentFilled: { backgroundColor: colors.primary },
  stepCard: { ...card, padding: spacing.lg, marginBottom: spacing.lg },
  stepTitle: {
    fontSize: font.lg,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  stepBody: {
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  navRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  navBtn: { flex: 1 },
  navSpacer: { flex: 1 },
  skipHit: { alignItems: 'center', minHeight: touch.min, justifyContent: 'center' },
  skipText: { fontSize: font.body, fontWeight: '600', color: colors.primary },
  replayLead: {
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
    marginBottom: spacing.md,
  },
});