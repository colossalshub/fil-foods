import { View, Text, StyleSheet } from 'react-native';
import OrderStatusBadge from './OrderStatusBadge';
import { ORDERS_COPY } from '../data/messages';
import { colors, card, font, spacing, fonts } from '../theme/theme';

export default function OrderSummaryCard({
  orderRef,
  trackingNumber,
  status,
  fulfillmentSummary,
  totalLabel,
  waiting,
}: {
  orderRef?: string;
  trackingNumber?: string;
  status: string;
  fulfillmentSummary?: string;
  totalLabel?: string;
  waiting?: { label: string; value: string } | null;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.refRow}>
        <View style={styles.refBlock}>
          <Text style={styles.label}>{ORDERS_COPY.orderReference}</Text>
          <Text style={styles.refValue}>{orderRef}</Text>
        </View>
        <View style={styles.statusCol}>
          <OrderStatusBadge status={status} variant="outline" />
          {waiting ? (
            <View>
              <Text style={styles.label}>{waiting.label}</Text>
              <Text style={styles.value}>{waiting.value}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {trackingNumber ? (
        <View style={styles.row}>
          <Text style={styles.label}>{ORDERS_COPY.trackingNumber}</Text>
          <Text style={styles.value}>{trackingNumber}</Text>
        </View>
      ) : null}
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
  statusCol: { alignItems: 'flex-end', gap: 4, maxWidth: '55%' },
  label: { fontFamily: fonts.regular, fontSize: font.sm, color: colors.muted },
  refValue: { fontFamily: fonts.bold, fontSize: font.body, color: colors.text },
  row: { gap: 4 },
  value: { fontFamily: fonts.regular, fontSize: font.body, color: colors.text, lineHeight: 22 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontFamily: fonts.bold, fontSize: font.lg, color: colors.primary },
});