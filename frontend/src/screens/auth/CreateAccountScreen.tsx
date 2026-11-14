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
import { PrivacyModal, TermsModal } from '../../components/LegalModals';
import { register } from '../../services/authService';
import { MSG } from '../../data/messages';
import type { FieldMap } from '../../types';
import { colors, font, spacing } from '../../theme/theme';

const EMPTY = {
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  contactNumber: '',
  address: '',
  email: '',
  username: '',
  password: '',
};

export default function CreateAccountScreen({ navigation }: {
  navigation: { navigate: (name: string, params?: object) => void; replace: (name: string, params?: object) => void };
}) {
  const { signIn } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [accountFor, setAccountFor] = useState<'self' | 'family' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [fields, setFields] = useState<FieldMap>({});
  const [messages, setMessages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const onRegister = async () => {
    if (!accountFor) return;
    setLoading(true);
    try {
      const result = await register({ ...form, accountFor, acceptedTerms: accepted });
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
            {!showForm ? (
              <>
                <Text style={styles.title} accessibilityRole="header">Who is this meal subscription for?</Text>
                <Text style={styles.subtitle}>
                  Choose who will receive the meals. You can manage a family member&apos;s profile from your account.
                </Text>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: accountFor === 'self' }}
                  onPress={() => setAccountFor('self')}
                  style={[styles.choice, accountFor === 'self' && styles.choiceSelected]}
                >
                  <Text style={styles.choiceTitle}>Signing Up for Myself</Text>
                  <Text style={styles.choiceDescription}>I will receive and consume the meals.</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: accountFor === 'family' }}
                  onPress={() => setAccountFor('family')}
                  style={[styles.choice, accountFor === 'family' && styles.choiceSelected]}
                >
                  <Text style={styles.choiceTitle}>Signing Up for a Family Member</Text>
                  <Text style={styles.choiceDescription}>Ordering for a parent, senior relative, or loved one.</Text>
                </Pressable>
                {messages.length > 0 ? <FormMessage messages={messages} /> : null}
                <AppButton
                  title="Continue"
                  onPress={() => {
                    if (!accountFor) {
                      setMessages([MSG.registrationTypeRequired]);
                      return;
                    }
                    setMessages([]);
                    setShowForm(true);
                  }}
                  color={colors.action}
                  style={styles.action}
                />
              </>
            ) : (
              <>
                <Pressable onPress={() => setShowForm(false)} style={styles.backLink}>
                  <Text style={styles.termsLinkText}>‹ Change subscription recipient</Text>
                </Pressable>
                <Text style={styles.title} accessibilityRole="header">Create your account</Text>
                <Text style={styles.subtitle}>
                  {accountFor === 'family'
                    ? 'Create your account first. You will add the meal recipient next.'
                    : 'Add your details to get started with F.I.L Foods.'}
                </Text>

                <FormMessage messages={messages} />

                <AppInput label="First name" value={form.firstName} onChangeText={set('firstName')} autoCapitalize="words" autoComplete="given-name" error={fields.firstName} fieldStyle={styles.input} />
                <AppInput label="Middle name (optional)" value={form.middleName} onChangeText={set('middleName')} autoCapitalize="words" fieldStyle={styles.input} />
                <AppInput label="Last name" value={form.lastName} onChangeText={set('lastName')} autoCapitalize="words" autoComplete="family-name" error={fields.lastName} fieldStyle={styles.input} />
                <AppInput label="Suffix (optional)" value={form.suffix} onChangeText={set('suffix')} autoCapitalize="words" accessibilityLabel="Suffix, optional, for example Jr or III" fieldStyle={styles.input} />
                <AppInput label="Contact number" value={form.contactNumber} onChangeText={set('contactNumber')} keyboardType="number-pad" autoComplete="tel" error={fields.contactNumber} fieldStyle={styles.input} />
                {accountFor === 'self' ? (
                  <AppInput label="Delivery address" value={form.address} onChangeText={set('address')} autoCapitalize="words" error={fields.address} fieldStyle={styles.input} />
                ) : null}
                <AppInput label="Email address" value={form.email} onChangeText={set('email')} keyboardType="email-address" autoComplete="email" autoCapitalize="none" error={fields.email} fieldStyle={styles.input} />
                <AppInput label="Username" value={form.username} onChangeText={set('username')} autoComplete="username" autoCapitalize="none" error={fields.username} fieldStyle={styles.input} />
                <AppInput label="Password (at least 8 characters)" value={form.password} onChangeText={set('password')} secure autoComplete="password-new" textContentType="newPassword" error={fields.password} fieldStyle={styles.input} />

                <Checkbox
                  checked={accepted}
                  onToggle={() => setAccepted((value) => !value)}
                  accessibilityLabel="I have read and agree to the Terms and Conditions"
                >
                  I have read and agree to the Terms and Conditions
                </Checkbox>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setAccepted(false);
                    setFields({});
                    setMessages([]);
                    setShowForm(false);
                  }}
                  style={styles.termsLink}
                >
                  <Text style={styles.termsLinkText}>Decline</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="View Terms and Conditions"
                  onPress={() => setShowTerms(true)}
                  style={styles.termsLink}
                >
                  <Text style={styles.termsLinkText}>View Terms and Conditions</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="View Privacy Policy"
                  onPress={() => setShowPrivacy(true)}
                  style={styles.termsLink}
                >
                  <Text style={styles.termsLinkText}>View Privacy Policy</Text>
                </Pressable>
                {fields.terms ? <Text style={styles.fieldError}>{fields.terms}</Text> : null}

                <AppButton title="Sign Up" onPress={onRegister} loading={loading} color={colors.action} style={styles.action} />
                <GoogleSignIn
                  accountFor={accountFor || 'self'}
                  color={colors.primary}
                  style={styles.action}
                  onSuccess={(googleUser) => signIn(googleUser, { keepLoggedIn: false })}
                />

                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Log in"
                  onPress={() => navigation.navigate('Login')}
                  style={styles.loginLink}
                >
                  <Text style={styles.loginText}>Already have an account? Log in</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <TermsModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => { setAccepted(true); setShowTerms(false); }}
      />
      <PrivacyModal visible={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.soft, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.white },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  input: { minHeight: 48, backgroundColor: colors.white, borderColor: colors.border, borderRadius: 12 },
  helpRow: { alignItems: 'flex-end' },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
  subtitle: { fontSize: font.body, lineHeight: 24, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  termsLink: { minHeight: 48, justifyContent: 'center', marginTop: -4, marginBottom: spacing.sm },
  backLink: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  termsLinkText: { fontSize: font.body, color: colors.action, textDecorationLine: 'underline' },
  choice: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.soft },
  choiceTitle: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  choiceDescription: { color: colors.muted, fontSize: font.body, lineHeight: 24, marginTop: spacing.xs },
  fieldError: { fontSize: font.body, lineHeight: 22, color: colors.danger, marginBottom: spacing.md },
  action: { marginTop: spacing.sm },
  loginLink: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  loginText: { fontSize: font.body, color: colors.primary, fontWeight: '600' },
});
