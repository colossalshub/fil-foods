import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppInput from '../../components/AppInput';
import HelpButton from '../../components/HelpButton';
import AppButton from '../../components/AppButton';
import Checkbox from '../../components/Checkbox';
import FormMessage from '../../components/FormMessage';
import GoogleSignIn from '../../components/GoogleSignIn';
import LogoPlaceholder from '../../components/LogoPlaceholder';
import { useAuth } from '../../context/AuthContext';
import { TermsModal } from '../../components/LegalModals';
import { register } from '../../services/authService';
import { MSG } from '../../data/messages';
import { colors, font, spacing } from '../../theme/theme';

const EMPTY = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  contactNumber: '',
  email: '',
  username: '',
  password: '',
};

export default function CreateAccountScreen({ navigation }) {
  const { signIn } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [fields, setFields] = useState({});
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const onRegister = async () => {
    setLoading(true);
    try {
      const result = await register({ ...form, acceptedTerms: accepted });
      if (!result.ok) {
        setFields(result.fields || {});
        setMessages(result.messages || [MSG.required]);
        return;
      }
      setFields({});
      setMessages([]);
      navigation.replace('VerifyAccount', { userId: result.userId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.column} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.helpRow}>
              <HelpButton />
            </View>
            <LogoPlaceholder />
            <Text style={styles.title} accessibilityRole="header">Create account</Text>
            <Text style={styles.subtitle}>
              Register with your details so you can order meals and keep your health information in one place.
            </Text>

            <FormMessage messages={messages} />

            <AppInput label="First name" value={form.firstName} onChangeText={set('firstName')} autoCapitalize="words" autoComplete="given-name" error={fields.firstName} />
            <AppInput label="Middle name (optional)" value={form.middleName} onChangeText={set('middleName')} autoCapitalize="words" />
            <AppInput label="Last name" value={form.lastName} onChangeText={set('lastName')} autoCapitalize="words" autoComplete="family-name" error={fields.lastName} />
            <AppInput label="Suffix (optional)" value={form.suffix} onChangeText={set('suffix')} autoCapitalize="words" accessibilityLabel="Suffix, optional, for example Jr or III" />
            <AppInput label="Contact number" value={form.contactNumber} onChangeText={set('contactNumber')} keyboardType="number-pad" autoComplete="tel" error={fields.contactNumber} />
            <AppInput label="Email address" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoComplete="email" autoCapitalize="none" error={fields.email} />
            <AppInput label="Username" value={form.username} onChangeText={set('username')} autoComplete="username" autoCapitalize="none" error={fields.username} />
            <AppInput label="Password (at least 8 characters)" value={form.password} onChangeText={set('password')} secure autoComplete="password-new" textContentType="newPassword" error={fields.password} />

            <Checkbox
              checked={accepted}
              onToggle={() => setAccepted((value) => !value)}
              accessibilityLabel="I accept the Terms and Conditions"
            >
              I accept the Terms and Conditions
            </Checkbox>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="View Terms and Conditions"
              onPress={() => setShowTerms(true)}
              style={styles.termsLink}
            >
              <Text style={styles.termsLinkText}>View Terms and Conditions</Text>
            </Pressable>
            {fields.terms ? <Text style={styles.fieldError}>{fields.terms}</Text> : null}

            <AppButton title="Register" onPress={onRegister} loading={loading} color={colors.action} style={styles.action} />
            <GoogleSignIn
              showDemo
              color={colors.primary}
              style={styles.action}
              onSuccess={(googleUser) => signIn(googleUser, { keepLoggedIn: false })}
              onLink={(google) => navigation.navigate('LinkGoogle', { google, keepLoggedIn: false })}
            />

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Log in"
              onPress={() => navigation.navigate('Login')}
              style={styles.loginLink}
            >
              <Text style={styles.loginText}>Already have an account? Log in</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <TermsModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => { setAccepted(true); setShowTerms(false); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.page },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  helpRow: { alignItems: 'flex-end' },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
  subtitle: { fontSize: font.body, lineHeight: 24, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  termsLink: { minHeight: 48, justifyContent: 'center', marginTop: -4, marginBottom: spacing.sm },
  termsLinkText: { fontSize: font.body, color: colors.action, textDecorationLine: 'underline' },
  fieldError: { fontSize: font.body, lineHeight: 22, color: colors.danger, marginBottom: spacing.md },
  action: { marginTop: spacing.sm },
  loginLink: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  loginText: { fontSize: font.body, color: colors.primary, fontWeight: '600' },
});
