import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppInput from '../../components/AppInput';
import HelpButton from '../../components/HelpButton';
import AppButton from '../../components/AppButton';
import Checkbox from '../../components/Checkbox';
import GoogleSignIn from '../../components/GoogleSignIn';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../services/authService';
import { colors, font, spacing } from '../../theme/theme';

const GREEN = '#1B7A3A';
const plate = require('../../../assets/images/fil-foods-logo.png');

const fieldStyle = {
  height: 52,
  borderRadius: 14,
  borderColor: GREEN,
  backgroundColor: colors.white,
};

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    const e = {};
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
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.helpRow}>
          <HelpButton color={colors.white} />
        </View>
        <View
          accessibilityLabel="F.I.L. FOODS logo"
          style={styles.plateWrap}
        >
          <Image source={plate} style={styles.plate} resizeMode="contain" />
        </View>
        <Text style={styles.brand} accessibilityRole="header">Food is Life</Text>
        <Text style={styles.tagline}>Healthy meals, made with care.</Text>
      </SafeAreaView>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <AppInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoComplete="username"
            textContentType="username"
            error={errors.username}
            fieldStyle={fieldStyle}
            labelStyle={styles.label}
          />
          <AppInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secure
            autoComplete="password"
            textContentType="password"
            error={errors.password}
            fieldStyle={fieldStyle}
            labelStyle={styles.label}
          />
          <Pressable
            accessibilityRole="link"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotLink}
          >
            <Text style={styles.textLinkLabel}>Forgot password?</Text>
          </Pressable>
          <Checkbox checked={keep} onToggle={() => setKeep((k) => !k)} color={GREEN}>Keep me logged in</Checkbox>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}

          <AppButton title="Log in" onPress={onLogin} loading={loading} color={GREEN} style={styles.primary} />
          <GoogleSignIn
            showDemo
            color={GREEN}
            style={styles.outline}
            onSuccess={(googleUser) => signIn(googleUser, { keepLoggedIn: keep })}
            onLink={(google) => navigation.navigate('LinkGoogle', { google, keepLoggedIn: keep })}
          />

          <Pressable
            accessibilityRole="link"
            onPress={() => navigation.navigate('CreateAccount')}
            style={styles.textLink}
          >
            <Text style={styles.textLinkLabel}>Create an account</Text>
          </Pressable>

          <AppButton
            title="Continue as visitor"
            variant="outline"
            onPress={() => signIn({ role: 'visitor', username: 'visitor' })}
            color={GREEN}
            style={styles.visitorButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#1A1A1A', alignItems: 'center' },
  root: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.white },
  flex: { flex: 1 },
  header: {
    backgroundColor: GREEN,
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  helpRow: { alignSelf: 'flex-end' },
  plateWrap: {
    width: 88,
    height: 88,
  },
  plate: { width: 88, height: 88 },
  brand: { color: colors.white, fontSize: 26, fontWeight: '700', marginTop: spacing.lg, textAlign: 'center' },
  tagline: { color: 'rgba(255,255,255,0.92)', fontSize: font.lg, marginTop: 4, textAlign: 'center' },
  form: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  label: { color: colors.text, fontSize: font.md, fontWeight: '600', marginBottom: 6 },
  formError: { color: colors.danger, fontSize: font.sm, marginBottom: spacing.sm },
  primary: { borderRadius: 16, marginTop: 4 },
  outline: { borderRadius: 16, borderColor: GREEN, marginTop: spacing.md },
  forgotLink: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-end', paddingHorizontal: spacing.sm },
  textLink: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.sm, marginTop: spacing.sm },
  textLinkLabel: { color: GREEN, fontSize: font.md, fontWeight: '700', textAlign: 'center' },
  visitorButton: { marginTop: spacing.lg },
});
