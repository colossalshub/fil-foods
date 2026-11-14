import { View, Text, StyleSheet } from 'react-native';
import OrderStatusBadge from './OrderStatusBadge';
import { ORDERS_COPY } from '../data/messages';
import { colors, card, font, spacing } from '../theme/theme';

export default function OrderSummaryCard({
  trackingNumber,
  status,
  fulfillmentSummary,
  totalLabel,
}: {
  trackingNumber?: string;
  status: string;
  fulfillmentSummary?: string;
  totalLabel?: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.refRow}>
        <View style={styles.refBlock}>
          <Text style={styles.label}>{ORDERS_COPY.orderReference}</Text>
          <Text style={styles.refValue}>{trackingNumber}</Text>
        </View>
        <OrderStatusBadge status={status} variant="outline" />
      </View>
      {fulfillmentSummary ? (
        <View style={styles.row}>
          <Text style={styles.label}>{ORDERS_COPY.fulfillment}</Text>
          <Text style={styles.value}>{fulfillmentSummary}</Text>
        </View>
      ) : null}
      {totalLabel ? (
        <View style={styles.totalRow}>
          <Text style={styles.label}>{ORDERS_COPY.total}</Text>
          <Text style={styles.total}>{totalLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...card, padding: spacing.lg, gap: spacing.md },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  refBlock: { flex: 1, gap: 4 },
  label: { fontSize: font.sm, color: colors.muted },
  refValue: { fontSize: font.body, fontWeight: '800', color: colors.text },
  row: { gap: 4 },
  value: { fontSize: font.body, color: colors.text, lineHeight: 22 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: font.lg, fontWeight: '800', color: colors.primary },
});