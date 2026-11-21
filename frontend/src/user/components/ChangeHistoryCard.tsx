import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ProfileHistoryEntry } from '../types';
import { historySectionLabel } from '../services/profileService';
import { formatTimestamp } from '../utils/time';
import { card, colors, fonts, radius, spacing, type } from '../theme/theme';

type Props = {
  entry: ProfileHistoryEntry & { formatted?: string };
  /** Who the meals are for, shown on each entry (USR-46). */
  recipientName?: string | null;
};

/**
 * One read-only change-history entry (USR-38): date and time, the field changed and the
 * old and new value. Entries have no edit or delete controls.
 */
function ChangeHistoryCard({ entry, recipientName }: Props) {
  const updated = entry.action === 'updated' && (entry.previousValue || entry.newValue);
  const removed = entry.action === 'removed';
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={entry.formatted}
    >
      <Text style={styles.when}>{formatTimestamp(entry.at)}</Text>
      <Text style={styles.field}>{historySectionLabel(entry.section)}</Text>
      {updated ? (
        <View style={styles.valueRow}>
          <Text style={styles.item}>{entry.item}:</Text>
          <Text style={[styles.value, styles.oldValue]}>{entry.previousValue || 'none'}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          <Text style={styles.value}>{entry.newValue || 'none'}</Text>
        </View>
      ) : (
        <View style={styles.valueRow}>
          <Text style={styles.item}>{entry.item}</Text>
          <View style={[styles.badge, removed ? styles.badgeRemoved : styles.badgeAdded]}>
            <Text style={[styles.badgeText, removed ? styles.badgeTextRemoved : styles.badgeTextAdded]}>
              {removed ? 'Removed' : 'Added'}
            </Text>
          </View>
        </View>
      )}
      {entry.whoName ? (
        <Text style={styles.meta}>
          {`Changed by ${entry.whoName}${recipientName ? ` · Recipient: ${recipientName}` : ''}`}
        </Text>
      ) : recipientName ? (
        <Text style={styles.meta}>{`Recipient: ${recipientName}`}</Text>
      ) : null}
    </View>
  );
}

export default memo(ChangeHistoryCard);

const styles = StyleSheet.create({
  card: {
    ...card,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    gap: 6,
    marginBottom: spacing.md,
  },
  when: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.muted },
  field: { ...type.cardTitle, fontSize: 18, lineHeight: 24 },
  valueRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  item: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  value: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.text },
  oldValue: { color: colors.muted, textDecorationLine: 'line-through' },
  badge: { borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 2 },
  badgeAdded: { backgroundColor: colors.mint, borderColor: colors.primary },
  badgeRemoved: { backgroundColor: colors.white, borderColor: colors.danger },
  badgeText: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  badgeTextAdded: { color: colors.primary },
  badgeTextRemoved: { color: colors.danger },
  meta: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.muted },
});
