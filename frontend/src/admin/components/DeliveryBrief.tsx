import { StyleSheet, View } from 'react-native';
import { destinationFor, edgeKm, shortestPath } from '../../lib/algorithms/routeGraph.js';
import { sodiumCheck } from '../domain/deliveryCheck.js';
import { detailStatusLabel } from '../domain/roleAccess.js';
import { useAdmin } from '../context.js';
import type { AdminOrder } from '../types';
import { Card } from '../ui/blocks.js';
import { Text } from '../ui/StaffText.js';

const STEPS = ['Ready for Pickup', 'Out for Delivery', 'Completed'] as const;

/** The three delivery states, with the current one marked. Completed cannot move again. */
export function DeliverySteps({ order }: { order: AdminOrder }) {
  const { colors } = useAdmin();
  const current = detailStatusLabel('delivery', order.status);
  const index = STEPS.indexOf(current as (typeof STEPS)[number]);
  return (
    <View style={styles.steps}>
      {STEPS.map((step, stepIndex) => {
        const on = stepIndex <= index;
        return (
          <View key={step} style={[styles.step, { backgroundColor: on ? colors.mint : colors.card, borderColor: on ? colors.primary : colors.border }]}>
            <Text style={{ color: on ? colors.greenDeep : colors.muted, fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Shortest path on the sample graph, from the kitchen hub to this recipient’s stop. */
export function DeliveryRoute({ firstName }: { firstName: string }) {
  const { colors } = useAdmin();
  const destination = destinationFor(firstName);
  const route = shortestPath('Hub', destination);
  if (!route) return null;
  return (
    <Card>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{route.path.join(' → ')}</Text>
      <Text style={{ color: colors.green, fontWeight: '700' }}>{route.km} km</Text>
      {route.path.slice(0, -1).map((stop, index) => {
        const next = route.path[index + 1];
        return (
          <Text key={`${stop}-${next}`} style={{ color: colors.muted, fontSize: 13 }}>
            {stop} to {next} · {edgeKm(stop, next)} km
          </Text>
        );
      })}
    </Card>
  );
}

/** Meal sodium against the recipient’s limit. A meal over the limit is flagged. */
export function SodiumCheck({ order }: { order: AdminOrder }) {
  const { colors } = useAdmin();
  const meal = order.lines[0]?.name ?? order.items?.[0]?.name ?? '';
  const check = sodiumCheck(meal, order.dietary);
  if (!check) return null;
  const tone = check.above ? colors.danger : colors.green;
  const verdict = check.limit == null
    ? 'No sodium limit on this profile'
    : check.above
      ? 'Above the sodium limit'
      : 'Within the sodium limit';
  return (
    <Card>
      <Text style={{ color: colors.text }}>{check.mg} mg in {meal}</Text>
      {check.limit != null ? <Text style={{ color: colors.muted }}>Limit {check.limit} mg</Text> : null}
      <Text style={{ color: tone, fontWeight: '700' }}>{verdict}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, justifyContent: 'center' },
});
