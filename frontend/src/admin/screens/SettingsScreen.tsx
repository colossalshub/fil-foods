import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../copy.js';
import { adminView, savePreferences, saveProfile, sendSupport } from '../data/store.js';
import { avatarLetter, formatWhen, peso } from '../domain/format.js';
import { useAdmin } from '../context.js';
import { openRoot, resetStaff, tabBarStyle, type ScreenProps } from '../nav.js';
import type { Appearance, Preferences } from '../types';
import {
  AdminField,
  ConfirmCard,
  FlashBanner,
  GreenHeader,
  PhoneFrame,
  PrimaryButton,
  StatusBadge,
  useStoreRevision,
} from '../components.js';

function actorFrom(session: { id: string; name: string; email: string; role: 'admin' | 'dietitian' | 'kitchen' | 'delivery' }) {
  return { id: session.id, name: session.name, email: session.email, role: session.role };
}

export function SettingsScreen({ navigation }: ScreenProps) {
  const { session, colors, t, signOut } = useAdmin();
  const [logout, setLogout] = useState(false);
  if (!session) return null;
  const rows = [
    { label: t('language'), onPress: () => navigation.navigate('Preferences') },
    { label: t('appearance'), onPress: () => navigation.navigate('Preferences') },
  ];
  const system = [
    { label: t('about'), onPress: () => navigation.navigate('About') },
    { label: t('help'), onPress: () => navigation.navigate('Help') },
  ];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.green }]}>
          <Text style={styles.avatarText}>{avatarLetter(session.name)}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{session.name}</Text>
        <Text style={{ color: colors.muted }}>{session.email}</Text>
        <Pressable onPress={() => navigation.navigate('EditProfile')} style={styles.edit}>
          <Text style={{ color: colors.green, fontWeight: '700' }}>{t('editProfile')}</Text>
        </Pressable>
      </View>
      <Text style={[styles.group, { color: colors.muted }]}>{t('preferences')}</Text>
      {rows.map((row) => (
        <Pressable key={row.label} onPress={row.onPress} style={[styles.row, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{row.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
      <Text style={[styles.group, { color: colors.muted }]}>{t('records')}</Text>
      <Pressable onPress={() => navigation.navigate('Customers')} style={[styles.row, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontSize: 16 }}>{t('customers')}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Audit')} style={[styles.row, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontSize: 16 }}>{t('audit')}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
      <Text style={[styles.group, { color: colors.muted }]}>{t('systemSection')}</Text>
      {system.map((row) => (
        <Pressable key={row.label} onPress={row.onPress} style={[styles.row, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontSize: 16 }}>{row.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
      <Pressable onPress={() => setLogout(true)} style={[styles.row, { borderColor: colors.border }]}>
        <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '700' }}>{t('logout')}</Text>
      </Pressable>
      <ConfirmCard
        visible={logout}
        title={COPY.logoutTitle}
        confirmLabel={COPY.logOut}
        cancelLabel={COPY.stay}
        danger
        onCancel={() => setLogout(false)}
        onConfirm={async () => {
          setLogout(false);
          const role = session.role;
          await signOut();
          resetStaff(navigation, {
            index: 1,
            routes: [
              { name: 'SignInRequired' },
              { name: 'StaffLogin', params: { role } },
            ],
          });
        }}
      />
    </ScrollView>
  );
}

export function EditProfileScreen({ navigation }: ScreenProps) {
  const { session, colors, showFlash, patchSession } = useAdmin();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(session?.name ?? '');
  const [email, setEmail] = useState(session?.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [leave, setLeave] = useState(false);
  const pending = useRef<unknown>(null);
  const skip = useRef(false);
  const dirty = name !== session?.name || email !== session?.email;

  useEffect(() => {
    const tabs = navigation.getParent();
    tabs?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => tabs?.setOptions({ tabBarStyle: tabBarStyle(insets, colors) });
  }, [navigation, insets, colors]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!dirty || skip.current) return;
      event.preventDefault();
      pending.current = event.data.action;
      setLeave(true);
    });
    return unsubscribe;
  }, [navigation, dirty]);

  if (!session) return null;
  return (
    <View style={styles.flex}>
      <GreenHeader title="Edit Profile" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <FlashBanner />
        <View style={[styles.avatar, { backgroundColor: colors.green, alignSelf: 'center' }]}>
          <Text style={styles.avatarText}>{avatarLetter(name)}</Text>
        </View>
        <AdminField icon="person-outline" value={name} onChangeText={setName} placeholder="Name" />
        <AdminField icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email Address" keyboardType="email-address" error={error} />
        <Text style={{ color: colors.muted, marginBottom: 12 }}>Admin · {COPY.roleLocked}</Text>
        <PrimaryButton
          title="Save"
          onPress={() => {
            const result = saveProfile(actorFrom(session), { name, email });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            if (result.account) patchSession({ name: result.account.name, email: result.account.email });
            setError(null);
            showFlash(result.message);
          }}
        />
      </ScrollView>
      <ConfirmCard
        visible={leave}
        title={COPY.leaveTitle}
        confirmLabel={COPY.leave}
        cancelLabel={COPY.keepEditing}
        onCancel={() => setLeave(false)}
        onConfirm={() => {
          skip.current = true;
          setLeave(false);
          if (pending.current) navigation.dispatch(pending.current);
        }}
      />
    </View>
  );
}

export function PreferencesScreen({ navigation }: ScreenProps) {
  const { session, prefs, colors, t, applyPrefs } = useAdmin();
  const [draft, setDraft] = useState<Preferences>(prefs);
  const save = () => {
    if (!session) return;
    const result = savePreferences(actorFrom(session), draft);
    if (result.ok && result.preferences) applyPrefs(result.preferences);
  };
  return (
    <View style={styles.flex}>
      <GreenHeader title={t('preferences')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ color: colors.muted }}>{t('preferencesHint')}</Text>
        <Text style={[styles.group, { color: colors.text }]}>{t('language')}</Text>
        {(['en', 'fil'] as const).map((language) => (
          <Choice key={language} label={language === 'en' ? t('english') : t('filipino')} selected={draft.language === language} onPress={() => setDraft({ ...draft, language })} />
        ))}
        <Text style={[styles.group, { color: colors.text }]}>{t('appearance')}</Text>
        {([
          ['light', t('light')],
          ['dark', t('dark')],
          ['system', t('system')],
        ] as [Appearance, string][]).map(([appearance, label]) => (
          <Choice key={appearance} label={label} selected={draft.appearance === appearance} onPress={() => setDraft({ ...draft, appearance })} />
        ))}
        <Text style={{ color: colors.muted, marginTop: 8 }}>{t('alwaysOn')}</Text>
        <PrimaryButton title={t('apply')} onPress={save} />
      </ScrollView>
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useAdmin();
  return (
    <Pressable onPress={onPress} style={[styles.choice, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.mint : colors.card }]}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
      {selected ? <Ionicons name="checkmark" size={18} color={colors.green} /> : null}
    </Pressable>
  );
}

export function HelpScreen({ navigation }: ScreenProps) {
  const { session, showFlash, colors } = useAdmin();
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={styles.flex}>
      <GreenHeader title="Help & Support" onBack={() => navigation.goBack()} />
      <View style={{ padding: 16 }}>
        <FlashBanner />
        <AdminField value={message} onChangeText={setMessage} placeholder="How can we help?" multiline error={error} />
        <PrimaryButton
          title="Send"
          onPress={() => {
            if (!session) return;
            const result = sendSupport(actorFrom(session), message);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            setMessage('');
            setError(null);
            showFlash(result.message);
          }}
        />
      </View>
    </View>
  );
}

export function AboutScreen({ navigation }: ScreenProps) {
  const { colors, t } = useAdmin();
  return (
    <View style={styles.flex}>
      <GreenHeader title={t('about')} onBack={() => navigation.goBack()} />
      <View style={{ padding: 24, gap: 8 }}>
        <Text style={[styles.name, { color: colors.text }]}>{COPY.brand}</Text>
        <Text style={[styles.tagline, { color: colors.green }]}>{COPY.tagline}</Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>{t('aboutBody')}</Text>
      </View>
    </View>
  );
}

export function AuditScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors, t } = useAdmin();
  const data = adminView();
  return (
    <View style={styles.flex}>
      <GreenHeader title={t('audit')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ color: colors.muted }}>{`Entries can't be edited.${data.intact ? ' Chain verified.' : ''}`}</Text>
        {data.audit.map((entry) => (
          <View key={entry.id} style={[styles.audit, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{entry.summary}</Text>
            <Text style={{ color: colors.muted }}>{entry.accountName} · {entry.accountEmail}</Text>
            <Text style={{ color: colors.muted }}>{entry.target}</Text>
            {entry.setting ? <Text style={{ color: colors.text }}>{entry.role}: {entry.setting} {entry.oldValue} → {entry.newValue}</Text> : null}
            <Text style={{ color: colors.muted, fontSize: 12 }}>{formatWhen(entry.at)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function CustomersScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors, t } = useAdmin();
  return (
    <View style={styles.flex}>
      <GreenHeader title={t('customers')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {adminView().customers.map((customer) => (
          <Pressable key={customer.id} onPress={() => openRoot(navigation, 'CustomerDetail', { id: customer.id })} style={[styles.row, { borderColor: colors.border }]}>
            <View>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{customer.name}</Text>
              <Text style={{ color: colors.muted }}>{customer.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function CustomerDetailScreen({ navigation, route }: ScreenProps<{ id?: string }>) {
  const { colors } = useAdmin();
  const customer = adminView().customers.find((row) => row.id === route.params?.id);
  return (
    <PhoneFrame>
      <GreenHeader title="Customer" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {!customer ? <Text style={{ color: colors.text }}>Customer not found.</Text> : (
          <>
            <Text style={[styles.name, { color: colors.text }]}>{customer.name}</Text>
            <Text style={{ color: colors.muted }}>{customer.email}</Text>
            <Text style={[styles.group, { color: colors.text }]}>Allergies</Text>
            <Text style={{ color: colors.text }}>{customer.allergies.length ? customer.allergies.join(' and ') : 'No allergies recorded.'}</Text>
            <Text style={[styles.group, { color: colors.text }]}>Nutrition preferences</Text>
            {customer.nutrition.length ? customer.nutrition.map((row) => (
              <Text key={row.label} style={{ color: colors.text }}>{row.label}: {row.value}</Text>
            )) : <Text style={{ color: colors.muted }}>No nutrition preferences recorded.</Text>}
            {customer.sodiumConflict ? (
              <View style={[styles.audit, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>Sodium · unresolved source conflict</Text>
                {customer.sodiumConflict.map((value) => <Text key={value} style={{ color: colors.text }}>{value}</Text>)}
              </View>
            ) : null}
            <Text style={[styles.group, { color: colors.text }]}>Order History</Text>
            {customer.history.map((row) => (
              <View key={`${row.name}-${row.price}`} style={[styles.row, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, flex: 1 }}>{row.name}</Text>
                <StatusBadge status={row.status} />
                <Text style={{ color: colors.text, fontWeight: '700' }}>{peso(row.price)}</Text>
              </View>
            ))}
            <Text style={{ color: colors.muted }}>Read only</Text>
          </>
        )}
      </ScrollView>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profile: { alignItems: 'center', paddingTop: 28, paddingBottom: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', marginTop: 10 },
  edit: { minHeight: 44, justifyContent: 'center' },
  group: { fontWeight: '800', marginTop: 18, marginBottom: 6, marginHorizontal: 16 },
  row: { marginHorizontal: 16, minHeight: 52, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  choice: { borderWidth: 1.5, borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between' },
  tagline: { fontSize: 18, fontWeight: '700' },
  audit: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
});
