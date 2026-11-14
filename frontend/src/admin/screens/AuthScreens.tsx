import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COPY, DEMO_PASSWORD, demoEmail, panelTitle } from '../copy.js';
import {
  isAdminOnline,
  loginAdmin,
  loginWithGoogle,
  authorizePanel,
  peekResetToken,
  requestPasswordReset,
  resetPassword,
  setAdminOnline,
  syncStaffDataFromBackend,
  tokenStatus,
} from '../data/store.js';
import { signInStaffToSupabase } from '../../lib/staffAuth.js';
import { useAdmin } from '../context.js';
import type { ScreenProps } from '../nav.js';
import type { StaffRole } from '../types';
import {
  AdminField,
  ConfirmCard,
  PasswordField,
  PhoneFrame,
  PrimaryButton,
} from '../components.js';

declare const require: (id: string) => number;
const logo = require('../../../assets/images/fil-foods-logo.png');

const ROLES: { id: StaffRole; title: string; body: string; icon: 'person' | 'medkit' | 'restaurant' | 'bicycle' }[] = [
  { id: 'admin', title: 'Admin', body: 'Managing staff, menu, plans, and meal options', icon: 'person' },
  { id: 'dietitian', title: 'Dietitian', body: 'Manage nutrition plans and meal options', icon: 'medkit' },
  { id: 'kitchen', title: 'Kitchen Staff', body: 'Prepare and manage food orders', icon: 'restaurant' },
  { id: 'delivery', title: 'Delivery Staff', body: 'Handle deliveries and track orders', icon: 'bicycle' },
];

function Blobs() {
  return (
    <>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />
    </>
  );
}

function Cloche() {
  return (
    <View style={styles.clocheWrap}>
      <Ionicons name="leaf" size={28} color="#8FCB98" style={{ transform: [{ rotate: '-40deg' }] }} />
      <View>
        <View style={styles.dome}>
          <View style={styles.knob} />
        </View>
        <View style={styles.platter} />
      </View>
      <Ionicons name="leaf" size={28} color="#1C773A" style={{ transform: [{ scaleX: -1 }, { rotate: '-40deg' }] }} />
    </View>
  );
}

export function RoleSelectScreen({ navigation }: ScreenProps) {
  const { highlighted, setHighlighted, colors } = useAdmin();
  return (
    <PhoneFrame>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <Blobs />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.getParent()?.goBack()}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={26} color={colors.green} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.roleBody}>
          <Text style={[styles.roleTitle, { color: colors.green }]} accessibilityRole="header">Select Your Role</Text>
          <Text style={[styles.roleSubtitle, { color: colors.muted }]}>Choose your role to continue</Text>
          {ROLES.map((role) => {
            const selected = highlighted === role.id;
            return (
              <Pressable
                key={role.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setHighlighted(role.id);
                  navigation.navigate('StaffLogin', { role: role.id });
                }}
                style={[
                  styles.roleCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selected && { backgroundColor: colors.mint, borderColor: colors.primary },
                ]}
              >
                <View style={[styles.roleIcon, { backgroundColor: selected ? '#D7F0DC' : colors.page }]}>
                  <Ionicons name={role.icon} size={22} color={colors.green} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.roleName, { color: colors.text }]}>{role.title}</Text>
                  <Text style={[styles.roleCopy, { color: colors.muted }]}>{role.body}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </PhoneFrame>
  );
}

export function StaffLoginScreen({ navigation, route }: ScreenProps<{ role?: StaffRole }>) {
  const role = route.params?.role ?? 'admin';
  const { signIn, showFlash, setHighlighted, colors } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleOpen, setGoogleOpen] = useState(false);
  const [offline, setOffline] = useState(!isAdminOnline());
  const [authError, setAuthError] = useState<{ title: string; detail: string } | null>(null);

  const finish = async (account: { id: string; name: string; email: string; role: StaffRole; disabled: boolean; sessionVersion: number; preferences: { language: 'en' | 'fil'; appearance: 'light' | 'dark' | 'system' } }) => {
    const gate = authorizePanel(account, role);
    if (!gate.ok) {
      setAuthError({ title: gate.title, detail: gate.detail });
      return;
    }
    const backend = await signInStaffToSupabase(account.email, password, role);
    await signIn(account, remember);
    if (backend.ok && !backend.skipped) {
      await syncStaffDataFromBackend();
    } else if (backend.ok === false) {
      showFlash('Signed in locally. Create this staff user in Supabase Auth to sync live orders.');
    }
    showFlash(COPY.loggedIn);
    navigation.reset({ index: 0, routes: [{ name: account.role === 'admin' ? 'AdminApp' : 'RoleHome' }] });
  };

  const onLogin = async () => {
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
    const result = loginAdmin(email, password);
    if (!result.ok) {
      if (result.field === 'email') setEmailError(result.message);
      else if (result.field === 'password') setPasswordError(result.message);
      else setFormError(result.message);
      return;
    }
    await finish(result.account);
  };

  const onGoogle = async (address: string) => {
    setGoogleOpen(false);
    const result = loginWithGoogle(address, role);
    if (!result.ok) {
      setAuthError({ title: result.title, detail: result.detail });
      return;
    }
    await finish(result.account);
  };

  return (
    <PhoneFrame>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <Blobs />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            setHighlighted(role);
            navigation.goBack();
          }}
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={26} color={colors.green} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.loginBody} keyboardShouldPersistTaps="handled">
          <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="F.I.L. Foods logo" />
          <Text style={[styles.brand, { color: colors.green }]}>{COPY.brand}</Text>
          <Text style={[styles.panel, { color: colors.text }]}>{panelTitle(role)}</Text>
          <Text style={[styles.tagline, { color: colors.muted }]}>{COPY.tagline}</Text>
          <Cloche />
          <AdminField icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email Address" keyboardType="email-address" error={emailError} />
          <PasswordField value={password} onChangeText={setPassword} placeholder="Password" error={passwordError} />
          <View style={styles.row}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: remember }} onPress={() => setRemember((current) => !current)} style={styles.remember}>
              <View style={[styles.box, { borderColor: colors.green }, remember && { backgroundColor: colors.green }]}>
                {remember ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
              </View>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Remember me</Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('ForgotPassword', { role })}>
              <Text style={{ color: colors.muted, fontWeight: '600' }}>Forgot password?</Text>
            </Pressable>
          </View>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <PrimaryButton title="Log In" onPress={onLogin} />
          <View style={styles.orRow}>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
            <Text style={{ color: colors.muted }}>or</Text>
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          </View>
          <Pressable accessibilityRole="button" onPress={() => setGoogleOpen(true)} style={[styles.google, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={styles.g}>G</Text>
            <Text style={[styles.googleText, { color: colors.text }]}>Continue with Google</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const next = !offline;
              setOffline(next);
              setAdminOnline(!next);
            }}
            style={styles.hintPress}
          >
            <Text style={[styles.hint, { color: colors.muted }]}>
              Demo · {demoEmail(role)} · {DEMO_PASSWORD}
            </Text>
            <Text style={[styles.hint, { color: colors.muted }]}>Connection: {offline ? 'Offline' : 'Online'}</Text>
          </Pressable>
          <Text style={[styles.footer, { color: colors.muted }]}>{COPY.brand} © 2026</Text>
        </ScrollView>
      </SafeAreaView>
      <Modal visible={googleOpen} transparent animationType="slide" onRequestClose={() => setGoogleOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={styles.sheetDismiss} onPress={() => setGoogleOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.panel, { color: colors.text }]}>Continue with Google</Text>
            <PrimaryButton title="admin@filfoods.ph" onPress={() => onGoogle('admin@filfoods.ph')} />
            <View style={{ height: 8 }} />
            <PrimaryButton title="guest.user@gmail.com" variant="outline" onPress={() => onGoogle('guest.user@gmail.com')} />
            <Pressable accessibilityRole="button" onPress={() => setGoogleOpen(false)} style={styles.sheetCancel}>
              <Text style={{ color: colors.green, fontWeight: '700' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <ConfirmCard
        visible={!!authError}
        title={authError?.title ?? ''}
        body={authError?.detail}
        confirmLabel="Back to login"
        onConfirm={() => setAuthError(null)}
      />
    </PhoneFrame>
  );
}

export function ForgotPasswordScreen({ navigation }: ScreenProps) {
  const { colors } = useAdmin();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const result = requestPasswordReset(email);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    navigation.navigate('CheckEmail', { email: email.trim() });
  };
  return (
    <PhoneFrame>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <Pressable accessibilityLabel="Back" onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.green} />
        </Pressable>
        <View style={styles.pad}>
          <Text style={[styles.roleTitle, { color: colors.text }]}>Forgot password</Text>
          <Text style={[styles.roleSubtitle, { color: colors.muted }]}>Enter the work email on the account.</Text>
          <AdminField icon="mail-outline" value={email} onChangeText={setEmail} placeholder="Email Address" keyboardType="email-address" error={error} />
          <PrimaryButton title="Send reset link" onPress={submit} />
        </View>
      </SafeAreaView>
    </PhoneFrame>
  );
}

export function CheckEmailScreen({ navigation, route }: ScreenProps<{ email?: string }>) {
  const { colors } = useAdmin();
  const email = route.params?.email ?? '';
  return (
    <PhoneFrame>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.pad}>
          <Text style={[styles.roleTitle, { color: colors.text }]}>{COPY.checkEmail}</Text>
          <Text style={[styles.neutral, { color: colors.muted }]}>{COPY.checkEmailBody}</Text>
          <PrimaryButton
            title="Open reset link"
            onPress={() => navigation.navigate('ResetPassword', { token: peekResetToken(email) ?? 'missing', email })}
          />
          <View style={{ height: 12 }} />
          <PrimaryButton title="Back to login" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    </PhoneFrame>
  );
}

export function ResetPasswordScreen({ navigation, route }: ScreenProps<{ token?: string; email?: string }>) {
  const { colors } = useAdmin();
  const token = route.params?.token ?? '';
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const expired = tokenStatus(token).ok === false;
  if (expired && !done) {
    return (
      <PhoneFrame>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={styles.pad}>
            <Text style={[styles.roleTitle, { color: colors.text }]}>{COPY.linkExpired}</Text>
            <PrimaryButton title={COPY.requestNewLink} onPress={() => navigation.navigate('ForgotPassword')} />
          </View>
        </SafeAreaView>
      </PhoneFrame>
    );
  }
  return (
    <PhoneFrame>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.pad}>
          <Text style={[styles.roleTitle, { color: colors.text }]}>{done ? COPY.passwordUpdated : 'New password'}</Text>
          {done ? (
            <PrimaryButton title="Back to login" onPress={() => navigation.navigate('StaffLogin', { role: 'admin' })} />
          ) : (
            <>
              <PasswordField value={next} onChangeText={setNext} placeholder="New password" />
              <PasswordField value={confirm} onChangeText={setConfirm} placeholder="Confirm password" error={error} />
              <PrimaryButton
                title="Update password"
                onPress={() => {
                  const result = resetPassword(token, next, confirm);
                  if (!result.ok) {
                    setError(result.message);
                    return;
                  }
                  setDone(true);
                  setError(null);
                }}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </PhoneFrame>
  );
}

export function SignInRequiredScreen({ navigation }: ScreenProps) {
  const { colors } = useAdmin();
  return (
    <PhoneFrame>
      <SafeAreaView style={[styles.flex, styles.center]} edges={['top', 'bottom']}>
        <Text style={[styles.roleTitle, { color: colors.text }]}>{COPY.signInRequired}</Text>
        <View style={styles.narrow}>
          <PrimaryButton title={COPY.goToLogin} onPress={() => navigation.navigate('StaffLogin', { role: 'admin' })} />
        </View>
      </SafeAreaView>
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginLeft: 8, zIndex: 2 },
  blob: { position: 'absolute' },
  blobTop: { top: -50, right: -40, width: 150, height: 150, borderRadius: 80, backgroundColor: '#D7EEDC' },
  blobBottom: { bottom: -70, left: -50, width: 190, height: 190, borderRadius: 100, backgroundColor: '#146B38' },
  roleBody: { paddingHorizontal: 20, paddingBottom: 32 },
  roleTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  roleSubtitle: { textAlign: 'center', marginTop: 6, marginBottom: 22, fontSize: 15 },
  roleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 16, padding: 14, marginBottom: 12 },
  roleIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  roleName: { fontSize: 16, fontWeight: '700' },
  roleCopy: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  loginBody: { paddingHorizontal: 24, paddingBottom: 28 },
  logo: { width: 78, height: 78, alignSelf: 'center' },
  brand: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  panel: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  tagline: { textAlign: 'center', marginTop: 4, marginBottom: 8 },
  clocheWrap: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, marginBottom: 22 },
  dome: { width: 112, height: 58, borderTopLeftRadius: 70, borderTopRightRadius: 70, backgroundColor: '#146B38', alignItems: 'center' },
  knob: { width: 18, height: 8, borderRadius: 6, backgroundColor: '#0E542C', marginTop: 8 },
  platter: { width: 132, height: 10, borderRadius: 8, backgroundColor: '#146B38', marginLeft: -10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  box: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  formError: { color: '#D64545', marginBottom: 10, fontSize: 14 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 },
  line: { flex: 1, height: 1 },
  google: { minHeight: 52, borderRadius: 26, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  g: { color: '#4285F4', fontWeight: '800', fontSize: 18 },
  googleText: { fontWeight: '700', fontSize: 16 },
  hintPress: { marginTop: 18, alignItems: 'center' },
  hint: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  footer: { textAlign: 'center', marginTop: 8, fontSize: 12 },
  pad: { padding: 24, gap: 8 },
  neutral: { fontSize: 16, lineHeight: 24, marginVertical: 12 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  narrow: { width: '100%', marginTop: 16 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16, 22, 18, 0.45)' },
  sheetDismiss: { flex: 1 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  sheetCancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
