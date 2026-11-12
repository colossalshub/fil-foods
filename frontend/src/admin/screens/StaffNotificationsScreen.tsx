import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { COPY } from '../copy.js';
import { adminView, saveRoleNotifications } from '../data/store.js';
import { useAdmin } from '../context.js';
import type { ScreenProps } from '../nav.js';
import type { NotificationTypes } from '../types';
import { ConfirmCard, FlashBanner, GreenHeader, PhoneFrame, useStoreRevision } from '../components.js';

const CREWS = [
  {
    id: 'kitchen' as const,
    title: 'Kitchen',
    types: [
      { key: 'newOrder' as const, label: 'New order' },
      { key: 'menuUpdated' as const, label: 'Menu updated' },
    ],
  },
  {
    id: 'delivery' as const,
    title: 'Delivery',
    types: [
      { key: 'readyForPickup' as const, label: 'Ready for pickup' },
      { key: 'menuUpdated' as const, label: 'Menu updated' },
    ],
  },
];

export function StaffNotificationsScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { session, colors, showFlash } = useAdmin();
  const settings = adminView().settings;
  const [pending, setPending] = useState<{ role: 'kitchen' | 'delivery'; types: NotificationTypes; label: string } | null>(null);
  const allowed = session?.role === 'admin';

  const apply = (role: 'kitchen' | 'delivery', types: NotificationTypes) => {
    if (!session) return;
    const result = saveRoleNotifications(
      { id: session.id, name: session.name, email: session.email, role: session.role },
      role,
      types,
    );
    showFlash(result.message);
  };

  return (
    <PhoneFrame>
      <GreenHeader title="Staff Notifications" onBack={() => navigation.goBack()} />
      {!allowed ? (
        <View style={styles.pad}>
          <Text style={[styles.denied, { color: colors.text }]}>{COPY.deniedNotifications}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.pad}>
          <FlashBanner />
          {CREWS.map((crew) => {
            const current = settings[crew.id];
            return (
              <View key={crew.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.row}>
                  <Text style={[styles.title, { color: colors.text }]}>{crew.title}</Text>
                  <Switch
                    value={current.enabled}
                    onValueChange={(on) => {
                      const types = Object.fromEntries(crew.types.map((type) => [type.key, on])) as NotificationTypes;
                      if (!on) setPending({ role: crew.id, types, label: crew.title });
                      else apply(crew.id, types);
                    }}
                    trackColor={{ true: colors.green, false: colors.border }}
                  />
                </View>
                {crew.types.map((type) => (
                  <View key={type.key} style={styles.row}>
                    <Text style={{ color: colors.text }}>{type.label}</Text>
                    <Switch
                      value={!!current.types[type.key]}
                      onValueChange={(on) => {
                        const types = { ...current.types, [type.key]: on };
                        if (!on) setPending({ role: crew.id, types, label: `${type.label} for ${crew.title}` });
                        else apply(crew.id, types);
                      }}
                      trackColor={{ true: colors.green, false: colors.border }}
                    />
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
      <ConfirmCard
        visible={!!pending}
        title={COPY.turnOff}
        body={pending ? `Turn off ${pending.label}?` : ''}
        confirmLabel={COPY.turnOff}
        cancelLabel="Cancel"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) apply(pending.role, pending.types);
          setPending(null);
        }}
      />
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '800' },
  denied: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
});
