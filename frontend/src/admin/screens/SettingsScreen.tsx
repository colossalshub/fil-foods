import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import type React from 'react';
import { Text } from '../ui/StaffText.js';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../copy.js';
import { adminView, noticesFor, savePreferences, saveProfileAsync, sendSupport } from '../data/store.js';
import { avatarLetter, formatWhen } from '../domain/format.js';
import { ROLE_TITLE } from '../domain/roleAccess.js';
import { useAdmin } from '../context.js';
import { openRoot, resetStaff, tabBarStyle, type ScreenProps } from '../nav.js';
import { BrandCard } from '../ui/blocks.js';
import type { Appearance, Preferences } from '../types';
import {
  AdminField,
  ConfirmCard,
  FlashBanner,
  GreenHeader,
  PrimaryButton,
  useStoreRevision,
} from '../components.js';

function actorFrom(session: { id: string; name: string; email: string; role: 'admin' | 'dietitian' | 'kitchen' | 'delivery' }) {
  return { id: session.id, name: session.name, email: session.email, role: session.role };
}

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  danger,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  const { colors } = useAdmin();
  const tint = danger ? colors.danger : colors.text;
  return (
    <Pressable accessibilityRole={onPress ? 'button' : undefined} disabled={!onPress} onPress={onPress} style={styles.setRow}>
      <Ionicons name={icon} size={20} color={tint} />
      <Text style={{ color: tint, fontSize: 15, flex: 1 }}>{label}</Text>
      {value ? <Text style={{ color: colors.muted, fontSize: 13 }}>{value}</Text> : null}
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}

/** ADM-06/07, DIT-06/07, KIT-06/07, DEL-06/07 (Figma "Settings"). */
export function SettingsScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { session, prefs, colors, t, signOut, applyPrefs } = useAdmin();
  const [logout, setLogout] = useState(false);
  if (!session) return null;
  const role = session.role;
  const unread = noticesFor(role, session.id).filter((notice) => !notice.readBy.includes(session.id)).length;
  const appearance = prefs.appearance === 'dark' ? 'Dark Mode' : prefs.appearance === 'system' ? 'Device setting' : 'Light Mode';
  const notificationsOn = prefs.notifications !== false;
  const group = (title: string, children: React.ReactNode) => (
    <>
      <Text style={[styles.groupTitle, { color: colors.text }]}>{title}</Text>
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>
    </>
  );
  return (
    <View style={styles.flex}>
      <GreenHeader
        title={t('settings')}
        onBack={() => navigation.navigate('Dashboard')}
        right={(
          <Pressable accessibilityLabel="Notifications" onPress={() => openRoot(navigation, 'Inbox')}>
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {unread && notificationsOn ? <View style={styles.dot} /> : null}
          </Pressable>
        )}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.greenDeep }]}>
            <Text style={styles.avatarText}>{avatarLetter(session.name)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>{session.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{session.email}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('EditProfile')} style={[styles.editBtn, { backgroundColor: colors.greenDeep }]}>
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>{t('editProfile')}</Text>
          </Pressable>
        </View>

        {group(t('preferences'), (
          <>
            {role === 'dietitian' ? (
              <SettingsRow
                icon="notifications-outline"
                label={t('notifications')}
                right={(
                  <Switch
                    accessibilityLabel="Notifications"
                    value={notificationsOn}
                    onValueChange={(on) => {
                      const next = { ...prefs, notifications: on };
                      savePreferences(actorFrom(session), next);
                      applyPrefs(next);
                    }}
                    trackColor={{ true: colors.green, false: colors.border }}
                  />
                )}
              />
            ) : null}
            <SettingsRow icon="globe-outline" label={t('language')} value={prefs.language === 'fil' ? t('filipino') : t('english')} onPress={() => navigation.navigate('Preferences')} />
            <SettingsRow icon="moon-outline" label={t('appearance')} value={appearance} onPress={() => navigation.navigate('Preferences')} />
          </>
        ))}

        {role === 'admin' ? group(t('records'), (
          <>
            <SettingsRow icon="people-outline" label={t('customers')} onPress={() => navigation.navigate('Customers')} />
            <SettingsRow icon="notifications-circle-outline" label={t('staffNotifications')} onPress={() => openRoot(navigation, 'StaffNotifications')} />
            <SettingsRow icon="document-text-outline" label={t('audit')} onPress={() => navigation.navigate('Audit')} />
          </>
        )) : null}

        {group(t('systemSection'), (
          <>
            <SettingsRow icon="information-circle-outline" label={t('about')} onPress={() => navigation.navigate('About')} />
            <SettingsRow icon="help-circle-outline" label={t('help')} onPress={() => navigation.navigate('Help')} />
            <SettingsRow icon="log-out-outline" label={t('logout')} danger onPress={() => setLogout(true)} />
          </>
        ))}
        <BrandCard role={role} />
      </ScrollView>
      <ConfirmCard
        visible={logout}
        title={COPY.logoutTitle}
        confirmLabel={COPY.logOut}
        cancelLabel={COPY.stay}
        danger
        onCancel={() => setLogout(false)}
        onConfirm={async () => {
          setLogout(false);
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
    </View>
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
        <Text style={{ color: colors.muted, marginBottom: 12 }}>{ROLE_TITLE[session.role]} · {COPY.roleLocked}</Text>
        <PrimaryButton
          title="Save"
          onPress={async () => {
            const result = await saveProfileAsync(actorFrom(session), { name, email });
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
  const { session, prefs, colors, t, applyPrefs, showFlash } = useAdmin();
  const [draft, setDraft] = useState<Preferences>(prefs);
  const save = () => {
    if (!session) return;
    const result = savePreferences(actorFrom(session), draft);
    if (result.ok && result.preferences) {
      applyPrefs(result.preferences);
      showFlash('Preferences saved');
      navigation.goBack();
    }
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
        {session?.role === 'admin' ? <Text style={{ color: colors.muted, marginTop: 8 }}>{t('alwaysOn')}</Text> : null}
        {session?.role === 'kitchen' || session?.role === 'delivery' ? <Text style={{ color: colors.muted, marginTop: 8 }}>{t('adminControlled')}</Text> : null}
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
  const { session, showFlash } = useAdmin();
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14 },
  groupTitle: { fontSize: 17, fontWeight: '600', marginTop: 18, marginBottom: 8 },
  groupCard: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  profileCard: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardName: { fontSize: 16, fontWeight: '600' },
  editBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  dot: { position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFB347' },
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
