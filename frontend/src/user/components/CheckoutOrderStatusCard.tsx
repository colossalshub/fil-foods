import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { checkoutFlow } from '../styles/checkoutFlow';

type Row = { label: string; value: string };

export default function CheckoutOrderStatusCard({
  rows,
  badge,
  badgeTone = 'warn',
  footer,
}: {
  rows: Row[];
  badge?: string;
  badgeTone?: 'warn' | 'ok';
  footer?: ReactNode;
}) {
  return (
    <View style={checkoutFlow.statusCard}>
      {rows.map((row) => (
        <Text key={row.label} style={checkoutFlow.line}>
          <Text style={checkoutFlow.lineBold}>{`${row.label}: `}</Text>
          {row.value}
        </Text>
      ))}
      {badge ? (
        <View style={[checkoutFlow.badge, badgeTone === 'ok' ? checkoutFlow.badgeOk : checkoutFlow.badgeWarn]}>
          <Text style={[checkoutFlow.badgeText, badgeTone === 'ok' && checkoutFlow.badgeTextOk]}>{badge}</Text>
        </View>
      ) : null}
      {footer}
    </View>
  );
}