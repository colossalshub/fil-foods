import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../copy.js';
import { addStaff, adminView, deleteStaff, previewStaff, updateStaff } from '../data/store.js';
import { useAdmin } from '../context.js';
import { openRoot, tabBarStyle, type ScreenProps } from '../nav.js';
import type { FieldChange, StaffRole } from '../types';
import {
  AdminField,
  ConfirmCard,
  FilterChips,
  FlashBanner,
  GreenHeader,
  PrimaryButton,
  useStoreRevision,
} from '../components.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'dietitian', label: 'Dietitians' },
  { id: 'kitchen', label: 'Kitchen Staff' },
  { id: 'delivery', label: 'Delivery' },
];

const ROLE_OPTIONS: StaffRole[] = ['dietitian', 'kitchen', 'delivery'];

function roleTitle(role: StaffRole) {
  if (role === 'dietitian') return 'Dietitian';
  if (role === 'kitchen') return 'Kitchen Staff';
  if (role === 'delivery') return 'Delivery Staff';
  return 'Admin';
}

export function StaffScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { session, colors, showFlash, t } = useAdmin();
  const [filter, setFilter] = useState('all');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const data = adminView();
  const people = data.staff.filter((person) => filter === 'all' || person.role === filter);
  const actor = session ? { id: session.id, name: session.name, email: session.email, role: session.role } : null;
  return (
    <View style={styles.flex}>
      <GreenHeader title={t('staff')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <FlashBanner />
        <PrimaryButton title={t('staffNotifications')} variant="outline" onPress={() => openRoot(navigation, 'StaffNotifications')} />
        <View style={{ height: 12 }} />
        <FilterChips options={FILTERS.map((item) => ({ ...item, label: item.id === 'all' ? t('all') : item.label }))} value={filter} onChange={setFilter} />
        <View style={{ height: 12 }} />
        {people.map((person) => (
          <View key={person.id} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.flex}>
              <Text style={[styles.name, { color: colors.text }]}>{person.name}</Text>
              <Text style={{ color: colors.muted }}>{roleTitle(person.role)}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{person.email}</Text>
            </View>
            <Pressable accessibilityLabel={`Edit ${person.name}`} onPress={() => navigation.navigate('StaffForm', { id: person.id })}>
              <Ionicons name="create-outline" size={22} color={colors.green} />
            </Pressable>
            <Pressable accessibilityLabel={`Delete ${person.name}`} onPress={() => setPendingDelete(person.id)}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        {data.pendingSetup ? (
          <View style={[styles.setup, { borderColor: colors.primary, backgroundColor: colors.mint }]}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{data.pendingSetup.name} can set a password from the setup link.</Text>
            <PrimaryButton title="Set password" onPress={() => openRoot(navigation, 'ResetPassword', { token: data.pendingSetup?.token, email: data.pendingSetup?.email })} />
          </View>
        ) : null}
        <PrimaryButton title={t('addStaff')} onPress={() => navigation.navigate('StaffForm')} />
      </ScrollView>
      <ConfirmCard
        visible={!!pendingDelete}
        title="Delete this staff account?"
        body={COPY.deleteWarn}
        confirmLabel={COPY.yesDelete}
        cancelLabel={COPY.noKeep}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!actor || !pendingDelete) return;
          const result = deleteStaff(actor, pendingDelete);
          setPendingDelete(null);
          showFlash(result.message);
        }}
      />
    </View>
  );
}

export function StaffFormScreen({ navigation, route }: ScreenProps<{ id?: string }>) {
  useStoreRevision();
  const insets = useSafeAreaInsets();
  const { session, colors, showFlash } = useAdmin();
  const existing = adminView().staff.find((person) => person.id === route.params?.id);
  const [name, setName] = useState(existing?.name ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [role, setRole] = useState<StaffRole>(existing?.role === 'admin' ? 'admin' : existing?.role ?? 'kitchen');
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<FieldChange[]>([]);
  const actor = session ? { id: session.id, name: session.name, email: session.email, role: session.role } : null;
  const lockedRole = existing?.role === 'admin';

  useEffect(() => {
    const tabs = navigation.getParent();
    tabs?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => tabs?.setOptions({ tabBarStyle: tabBarStyle(insets, colors) });
  }, [navigation, insets, colors]);

  const commit = () => {
    if (!actor) return;
    const result = existing
      ? updateStaff(actor, existing.id, { name, email, role })
      : addStaff(actor, { name, email, role });
    setChanges([]);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    showFlash(result.message);
    navigation.goBack();
  };

  return (
    <View style={styles.flex}>
      <GreenHeader title={existing ? 'Edit staff' : 'Add staff'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <AdminField icon="person-outline" value={name} onChangeText={setName} placeholder="Full name" />
        <AdminField icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email Address" keyboardType="email-address" error={error} />
        <Text style={{ color: colors.muted, marginBottom: 8 }}>{lockedRole ? COPY.roleLocked : 'Role'}</Text>
        <View style={styles.roles}>
          {(lockedRole ? ['admin' as StaffRole] : ROLE_OPTIONS).map((option) => (
            <Pressable
              key={option}
              disabled={lockedRole}
              onPress={() => setRole(option)}
              style={[styles.role, { borderColor: role === option ? colors.primary : colors.border, backgroundColor: role === option ? colors.mint : colors.card }]}
            >
              <Text style={{ color: colors.text }}>{roleTitle(option)}</Text>
            </Pressable>
          ))}
        </View>
        <PrimaryButton
          title={existing ? COPY.saveChanges : COPY.staffAdded.replace(' successfully', '')}
          onPress={() => {
            if (!existing) {
              commit();
              return;
            }
            const preview = previewStaff(existing.id, { name, email, role });
            if (!preview.ok) {
              setError(preview.message);
              return;
            }
            if (!preview.changes.length) {
              setError(COPY.nothingChanged);
              return;
            }
            setChanges(preview.changes);
          }}
        />
      </ScrollView>
      <ConfirmCard
        visible={changes.length > 0}
        title={existing ? `Change ${existing.name}` : 'Save changes'}
        body={changes.map((change) => `${change.label}: ${change.from} → ${change.to}`).join('\n')}
        confirmLabel={COPY.saveChanges}
        cancelLabel={COPY.keepEditing}
        onConfirm={commit}
        onCancel={() => setChanges([])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontWeight: '800', fontSize: 16 },
  setup: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10, marginBottom: 12 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  role: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
});
