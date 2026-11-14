import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppInput from '../../components/AppInput';
import HelpButton from '../../components/HelpButton';
import AppButton from '../../components/AppButton';
import Checkbox from '../../components/Checkbox';
import GoogleSignIn from '../../components/GoogleSignIn';
import AuthBackgroundDecor from '../../components/AuthBackgroundDecor';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../services/authService';
import { consumeLoginNotice } from '../../navigation/loginNotice';
import type { FieldMap } from '../../types';
import { colors, font, spacing } from '../../theme/theme';

declare const require: (id: string) => number;

const logo = require('../../../../assets/images/fil-foods-logo.png');

export default function LoginScreen({ navigation }: {
  navigation: { navigate: (name: string, params?: object) => void };
}) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(false);
  const [errors, setErrors] = useState<FieldMap>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    const notice = consumeLoginNotice();
    if (notice) setFormError(notice);
  }, []));

  const onLogin = async () => {
    const e: FieldMap = {};
    if (!username.trim()) e.username = 'Enter your username';
    if (!password) e.password = 'Enter your password';
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    setLoading(true);
    const res = await login({ username: username.trim(), password, keepLoggedIn: keep });
    setLoading(false);
    if (res.ok) {
      signIn(res.user, { keepLoggedIn: keep, session: res.session });
      return;
    }
    if (res.verifyRequired && res.userId) {
      navigation.navigate('VerifyAccount', { userId: res.userId });
    }
    setFormError(res.message || 'Could not log in. Try again.');
  };

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <AuthBackgroundDecor />
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={styles.header}>
                <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="F.I.L Foods meal logo" />
                <Text style={styles.brand} accessibilityRole="header">F.I.L Foods</Text>
                <Text style={styles.loginTitle}>Log in</Text>
                <Text style={styles.tagline}>Manage. Serve. Nourish.</Text>
              </View>

              <View style={styles.illustration} accessible={false}>
                <View style={styles.leftLeafOutline} />
                <View style={styles.leftLeaf} />
                <View style={styles.rightLeafTall} />
                <View style={styles.rightLeafWide} />
                <View style={styles.steam} />
                <View style={styles.dome} />
                <View style={styles.domeRim} />
              </View>

              <View style={styles.form}>
                <AppInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username or name@gmail.com"
                  accessibilityLabel="Username or email address"
                  autoComplete="username"
                  textContentType="username"
                  error={errors.username}
                  leadingIcon="mail-outline"
                  fieldStyle={styles.field}
                  style={styles.inputWrap}
                />
                <AppInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  accessibilityLabel="Password"
                  secure
                  secureToggleIcon
                  autoComplete="password"
                  textContentType="password"
                  error={errors.password}
                  leadingIcon="lock-closed-outline"
                  fieldStyle={styles.field}
                  style={styles.inputWrap}
                />
                <View style={styles.options}>
                  <View style={styles.remember}>
                    <Checkbox checked={keep} onToggle={() => setKeep((k) => !k)} color={colors.primary}>
                      Remember me
                    </Checkbox>
                  </View>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotLink}
                  >
                    <Text style={styles.textLinkLabel}>Forgot password?</Text>
                  </Pressable>
                </View>
                {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                <AppButton title="Log In" onPress={onLogin} loading={loading} color={colors.primaryDark} style={styles.primary} />
                <View style={styles.separator}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>or</Text>
                  <View style={styles.separatorLine} />
                </View>
                <GoogleSignIn
                  color={colors.primary}
                  style={styles.googleButton}
                  onSuccess={(googleUser) => signIn(googleUser, { keepLoggedIn: keep })}
                />

                <Pressable
                  accessibilityRole="link"
                  onPress={() => navigation.navigate('CreateAccount')}
                  style={styles.textLink}
                >
                  <Text style={styles.textLinkLabel}>Create an account</Text>
                </Pressable>

                <View style={styles.extraActions}>
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => navigation.navigate('Staff')}
                    style={styles.textLink}
                  >
                    <Text style={styles.textLinkLabel}>Staff sign in</Text>
                  </Pressable>
                  <View style={styles.helpRow}>
                    <HelpButton color={colors.primary} />
                  </View>
                </View>
              </View>
            </ScrollView>
            <Text style={styles.copyright}>F.I.L Foods © 2026</Text>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.authPage, alignItems: 'center' },
  root: { flex: 1, width: '100%', maxWidth: 430, overflow: 'hidden', backgroundColor: colors.authPage },
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  header: { alignItems: 'center', paddingTop: 68 },
  helpRow: { alignItems: 'center', marginTop: spacing.sm },
  logo: { width: 96, height: 96 },
  brand: { color: '#10251C', fontSize: 28, lineHeight: 34, fontWeight: '800', textAlign: 'center', marginTop: -spacing.xs },
  loginTitle: { color: '#10251C', fontSize: 20, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  tagline: { color: colors.deep, fontSize: font.body, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  illustration: { height: 96, alignItems: 'center', justifyContent: 'flex-end', marginTop: spacing.sm, marginBottom: spacing.lg },
  dome: { width: 128, height: 66, backgroundColor: colors.primaryDark, borderTopLeftRadius: 70, borderTopRightRadius: 70, zIndex: 1 },
  domeRim: { width: 148, height: 8, borderRadius: 8, backgroundColor: colors.deep, marginTop: -1, zIndex: 1 },
  steam: { position: 'absolute', width: 10, height: 10, top: 3, backgroundColor: colors.deep, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  leftLeaf: { position: 'absolute', width: 52, height: 30, left: 42, bottom: 6, backgroundColor: '#72A75E', borderTopLeftRadius: 5, borderTopRightRadius: 30, borderBottomRightRadius: 26, transform: [{ rotate: '20deg' }] },
  leftLeafOutline: { position: 'absolute', width: 38, height: 48, left: 34, top: 2, borderColor: '#9CCF7C', borderWidth: 2, borderRadius: 25, transform: [{ rotate: '36deg' }] },
  rightLeafTall: { position: 'absolute', width: 32, height: 58, right: 64, top: 0, backgroundColor: '#83B96C', borderTopLeftRadius: 34, borderTopRightRadius: 5, borderBottomLeftRadius: 34, transform: [{ rotate: '16deg' }] },
  rightLeafWide: { position: 'absolute', width: 50, height: 30, right: 43, bottom: 6, backgroundColor: '#83B96C', borderTopLeftRadius: 32, borderTopRightRadius: 5, borderBottomRightRadius: 32, transform: [{ rotate: '-42deg' }] },
  form: { paddingTop: 0 },
  inputWrap: { marginBottom: spacing.xs },
  field: {
    height: 48, minHeight: 48, paddingHorizontal: spacing.md, borderRadius: 16,
    borderColor: 'transparent', backgroundColor: colors.white,
    shadowColor: '#25402D', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  options: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -spacing.sm },
  remember: { flex: 1, minWidth: 0 },
  forgotLink: { minHeight: 48, justifyContent: 'center', paddingLeft: spacing.xs, flexShrink: 0 },
  textLinkLabel: { color: colors.primary, fontSize: font.sm, fontWeight: '700', textAlign: 'right' },
  formError: { color: colors.danger, fontSize: font.sm, marginBottom: spacing.sm },
  primary: { height: 48, borderRadius: 16, marginTop: 0, backgroundColor: colors.primaryDark },
  separator: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: 6 },
  separatorLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#DDE5D7' },
  separatorText: { color: colors.deep, fontSize: font.sm, lineHeight: 20 },
  googleButton: { height: 48, borderRadius: 16, borderWidth: 1.5, borderColor: '#78B996' },
  extraActions: { marginTop: 72 },
  textLink: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.sm, marginTop: spacing.xs },
  copyright: { color: colors.muted, fontSize: font.xs, lineHeight: 18, textAlign: 'center', paddingVertical: spacing.xs },
});
