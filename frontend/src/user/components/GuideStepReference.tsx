import type { ReactElement } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { GuideStepId } from '../data/helpContent';
import { GUIDE_COPY } from '../data/messages';
import { colors, font, radius, spacing } from '../theme/theme';

function MenuWireframe() {
  return (
    <View style={styles.frameInner}>
      <View style={styles.searchBar} />
      <View style={styles.row}>
        <View style={styles.mealCard} />
        <View style={styles.mealCard} />
      </View>
      <View style={styles.row}>
        <View style={styles.mealCard} />
        <View style={styles.mealCard} />
      </View>
    </View>
  );
}

function OrderWireframe() {
  return (
    <View style={styles.frameInner}>
      <View style={styles.lineWide} />
      <View style={styles.lineWide} />
      <View style={[styles.lineWide, { width: '70%' }]} />
      <View style={styles.primaryBlock} />
    </View>
  );
}

function TrackingWireframe() {
  return (
    <View style={styles.frameInner}>
      <View style={styles.timeline}>
        <View style={styles.dotFilled} />
        <View style={styles.timelineLine} />
        <View style={styles.dot} />
        <View style={styles.timelineLine} />
        <View style={styles.dot} />
      </View>
      <View style={styles.lineWide} />
      <View style={[styles.lineWide, { width: '55%' }]} />
    </View>
  );
}

function ProfileWireframe() {
  return (
    <View style={styles.frameInner}>
      <View style={styles.avatar} />
      <View style={styles.lineWide} />
      <View style={styles.lineWide} />
      <View style={[styles.lineWide, { width: '80%' }]} />
    </View>
  );
}

function HelpWireframe() {
  return (
    <View style={styles.frameInner}>
      <View style={styles.lineWide} />
      <View style={styles.faqRow} />
      <View style={styles.faqRow} />
      <View style={styles.faqRow} />
    </View>
  );
}

const WIREFRAMES: Record<GuideStepId, () => ReactElement> = {
  menu: MenuWireframe,
  order: OrderWireframe,
  tracking: TrackingWireframe,
  profile: ProfileWireframe,
  help: HelpWireframe,
};

export default function GuideStepReference({ stepId, caption }: { stepId: GuideStepId; caption: string }) {
  const Wire = WIREFRAMES[stepId];
  return (
    <View accessibilityRole="image" accessibilityLabel={caption}>
      <Text style={styles.refLabel} allowFontScaling>{GUIDE_COPY.screenReference}</Text>
      <View style={styles.phone}>
        <Wire />
        <View style={styles.captionPill}>
          <Text style={styles.captionText} allowFontScaling>{caption}</Text>
        </View>
      </View>
    </View>
  );
}

const block = colors.border;

const styles = StyleSheet.create({
  refLabel: {
    fontSize: font.sm,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  phone: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.soft,
    padding: spacing.md,
    minHeight: 160,
    justifyContent: 'center',
  },
  frameInner: { gap: spacing.sm },
  searchBar: {
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: block,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  mealCard: {
    flex: 1,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: block,
  },
  lineWide: {
    height: 10,
    width: '100%',
    borderRadius: 4,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: block,
  },
  primaryBlock: {
    marginTop: spacing.xs,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    opacity: 0.35,
  },
  timeline: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  dotFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  timelineLine: { flex: 1, height: 2, backgroundColor: block, marginHorizontal: 4 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: block,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  faqRow: {
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: block,
  },
  captionPill: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  captionText: { fontSize: font.sm, fontWeight: '600', color: colors.primary },
});