import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppInput from '../../components/AppInput';
import HelpButton from '../../components/HelpButton';
import AppButton from '../../components/AppButton';
import Checkbox from '../../components/Checkbox';
import FormMessage from '../../components/FormMessage';
import GoogleSignIn from '../../components/GoogleSignIn';
import LogoPlaceholder from '../../components/LogoPlaceholder';
import AuthBackgroundDecor from '../../components/AuthBackgroundDecor';
import { useAuth } from '../../context/AuthContext';
import { PrivacyModal, TermsModal } from '../../components/LegalModals';
import { register } from '../../services/authService';
import { MSG } from '../../data/messages';
import { loadTerms } from '../../data/terms';
import type { FieldMap } from '../../types';
import { card, colors, font, spacing, fonts } from '../../theme/theme';

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
  const [termsReady, setTermsReady] = useState(() => loadTerms().ok);
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
      const pending = (result as { pending?: { email: string; contactNumber?: string; firstName?: string } }).pending;
      navigation.replace('VerifyAccount', pending
        ? { live: true, email: pending.email, phone: pending.contactNumber, firstName: pending.firstName }
        : { userId: result.userId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.column} edges={['top', 'bottom']}>
        <AuthBackgroundDecor />
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.helpRow}>
              <HelpButton />
            </View>
            <LogoPlaceholder size={showForm ? 'md' : 'lg'} />
            {!showForm ? (
              <>
                <Text style={styles.title} accessibilityRole="header">Who is this meal subscription for?</Text>
                <Text style={styles.subtitle}>
                  Choose who will receive the meals. You can manage a family member&apos;s profile from your account.
                </Text>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel="Signing Up for Myself. I will receive and consume the meals."
                  accessibilityState={{ selected: accountFor === 'self', checked: accountFor === 'self' }}
                  onPress={() => { setAccountFor('self'); setMessages([]); }}
                  style={({ pressed }) => [styles.choice, accountFor === 'self' && styles.choiceSelected, pressed && styles.pressed]}
                >
                  <View style={styles.choiceIcon}>
                    <Ionicons name="person-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.choiceCopy}>
                    <Text style={styles.choiceTitle}>Signing Up for Myself</Text>
                    <Text style={styles.choiceDescription}>I will receive and consume the meals.</Text>
                  </View>
                  <View style={[styles.radio, accountFor === 'self' && styles.radioOn]}>
                    {accountFor === 'self' ? <View style={styles.radioDot} /> : null}
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel="Signing Up for a Family Member. Ordering for a parent, senior relative, or loved one."
                  accessibilityState={{ selected: accountFor === 'family', checked: accountFor === 'family' }}
                  onPress={() => { setAccountFor('family'); setMessages([]); }}
                  style={({ pressed }) => [styles.choice, accountFor === 'family' && styles.choiceSelected, pressed && styles.pressed]}
                >
                  <View style={styles.choiceIcon}>
                    <Ionicons name="people-outline" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.choiceCopy}>
                    <Text style={styles.choiceTitle}>Signing Up for a Family Member</Text>
                    <Text style={styles.choiceDescription}>Ordering for a parent, senior relative, or loved one.</Text>
                  </View>
                  <View style={[styles.radio, accountFor === 'family' && styles.radioOn]}>
                    {accountFor === 'family' ? <View style={styles.radioDot} /> : null}
                  </View>
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
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Log in"
                  onPress={() => navigation.navigate('Login')}
                  style={styles.loginLink}
                >
                  <Text style={styles.loginText}>Already have an account? Log in</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change subscription recipient"
                  onPress={() => setShowForm(false)}
                  style={styles.backLink}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.primary} />
                  <Text style={styles.backLinkText}>Change subscription recipient</Text>
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

                {termsReady ? null : (
                  <>
                    <Text style={styles.fieldError}>{MSG.termsLoadFailed}</Text>
                    <AppButton title="Try again" variant="outline" onPress={() => setTermsReady(loadTerms().ok)} color={colors.primary} />
                  </>
                )}
                <Checkbox
                  checked={accepted}
                  onToggle={() => {
                    if (!termsReady) return;
                    setAccepted((value) => !value);
                  }}
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

                <AppButton title="Sign Up" onPress={onRegister} loading={loading} disabled={!termsReady} color={colors.action} style={styles.action} />
                <GoogleSignIn
                  accountFor={accountFor || undefined}
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
  page: { flex: 1, backgroundColor: colors.authPage, alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 430, backgroundColor: colors.authPage, overflow: 'hidden' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  input: { minHeight: 48, backgroundColor: colors.white, borderColor: colors.border, borderRadius: 12 },
  helpRow: { alignItems: 'flex-end' },
  title: { fontFamily: fonts.semibold, fontSize: font.xl, lineHeight: 30, color: colors.heading, textAlign: 'center', marginTop: spacing.lg },
  subtitle: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  termsLink: { minHeight: 48, justifyContent: 'center', marginTop: -4, marginBottom: spacing.sm },
  backLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -4 },
  backLinkText: { fontFamily: fonts.medium, fontSize: font.body, color: colors.primary, marginLeft: 2 },
  termsLinkText: { fontFamily: fonts.regular, fontSize: font.body, color: colors.action, textDecorationLine: 'underline' },
  choice: {
    ...card,
    borderColor: colors.cardBorder,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.mint },
  pressed: { opacity: 0.85 },
  choiceIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.mintStrong, alignItems: 'center', justifyContent: 'center' },
  choiceCopy: { flex: 1 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.inactive, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  choiceTitle: { fontFamily: fonts.bold, color: colors.text, fontSize: font.body },
  choiceDescription: { fontFamily: fonts.regular, color: colors.muted, fontSize: font.body, lineHeight: 24, marginTop: spacing.xs },
  fieldError: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.danger, marginBottom: spacing.md },
  action: { marginTop: spacing.sm },
  loginLink: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  loginText: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.primary },
});
