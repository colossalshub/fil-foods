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
import { card, colors, font, radius, spacing, fonts } from '../../theme/theme';

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
  const [choiceMissing, setChoiceMissing] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof EMPTY) => (value: string) => setForm((current) => ({ ...current, [key]: value }));
  const attachedErrors = new Set(Object.values(fields).filter((value): value is string => typeof value === 'string' && value.length > 0));
  const banner = messages.filter((message) => !attachedErrors.has(message));

  const onSignUp = async () => {
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
            <View style={styles.topBar}>
              {showForm ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change subscription recipient"
                  onPress={() => { setShowForm(false); setFields({}); setMessages([]); }}
                  style={styles.backLink}
                >
                  <Ionicons name="chevron-back" size={20} color={colors.primary} />
                  <Text style={styles.backLinkText}>Change subscription recipient</Text>
                </Pressable>
              ) : <View />}
              <HelpButton />
            </View>
            {showForm ? null : <LogoPlaceholder size="md" showTagline={false} />}
            {!showForm ? (
              <>
                <Text style={styles.title} accessibilityRole="header">Who is this meal plan for?</Text>
                <Text style={styles.subtitle}>
                  Choose whether you are signing up for yourself or managing a meal subscription for a family member.
                </Text>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel="Signing Up for Myself. I am the meal recipient."
                  accessibilityState={{ selected: accountFor === 'self', checked: accountFor === 'self' }}
                  onPress={() => { setAccountFor('self'); setChoiceMissing(false); setMessages([]); }}
                  style={({ pressed }) => [
                    styles.choice,
                    accountFor === 'self' && styles.choiceSelected,
                    choiceMissing && styles.choiceError,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.choiceIcon, accountFor === 'self' && styles.choiceIconOn]}>
                    <Ionicons name="person" size={22} color={accountFor === 'self' ? colors.white : colors.primary} />
                  </View>
                  <View style={styles.choiceCopy}>
                    <View style={styles.choiceTitleRow}>
                      <Text style={styles.choiceTitle}>For Myself</Text>
                      <View style={styles.choiceTag}><Text style={styles.choiceTagLabel}>Personal</Text></View>
                    </View>
                    <Text style={styles.choiceDescription}>I am the meal recipient. Customize meals based on my own health condition and preferences.</Text>
                  </View>
                  <View style={[styles.radio, accountFor === 'self' && styles.radioOn]}>
                    {accountFor === 'self' ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel="Signing Up for a Family Member. Ordering for a parent, spouse, or loved one."
                  accessibilityState={{ selected: accountFor === 'family', checked: accountFor === 'family' }}
                  onPress={() => { setAccountFor('family'); setChoiceMissing(false); setMessages([]); }}
                  style={({ pressed }) => [
                    styles.choice,
                    accountFor === 'family' && styles.choiceSelected,
                    choiceMissing && styles.choiceError,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.choiceIcon, accountFor === 'family' && styles.choiceIconOn]}>
                    <Ionicons name="people" size={22} color={accountFor === 'family' ? colors.white : colors.primary} />
                  </View>
                  <View style={styles.choiceCopy}>
                    <View style={styles.choiceTitleRow}>
                      <Text style={styles.choiceTitle}>For a Family Member</Text>
                      <View style={styles.choiceTagWarm}><Text style={styles.choiceTagWarmLabel}>Caregiver / Gift</Text></View>
                    </View>
                    <Text style={styles.choiceDescription}>Ordering for a parent, spouse, or loved one. You will manage the account while we tailor meals to their health condition.</Text>
                  </View>
                  <View style={[styles.radio, accountFor === 'family' && styles.radioOn]}>
                    {accountFor === 'family' ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
                  </View>
                </Pressable>
                <View style={styles.note}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                  <Text style={styles.noteText}>You can add more family members later inside your F.I.L Foods dashboard anytime.</Text>
                </View>
                {choiceMissing ? <Text style={styles.fieldError}>Please choose who will receive the meals.</Text> : null}
                <AppButton
                  title={accountFor === 'self' ? 'Continue for Myself' : accountFor === 'family' ? 'Continue for a Family Member' : 'Continue'}
                  onPress={() => {
                    if (!accountFor) {
                      setChoiceMissing(true);
                      setMessages([MSG.registrationTypeRequired]);
                      return;
                    }
                    setChoiceMissing(false);
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
                <View style={styles.stepTrack}>
                  <View style={styles.stepDotOn}><Text style={styles.stepNumOn}>1</Text></View>
                  <View style={styles.stepLine} />
                  <View style={styles.stepDot}><Text style={styles.stepNum}>2</Text></View>
                </View>
                <View style={styles.stepLabels}>
                  <Text style={styles.stepLabelOn}>Personal Details</Text>
                  <Text style={styles.stepLabel}>Health Information</Text>
                </View>
                <View style={styles.signingBadge}>
                  <Text style={styles.signingBadgeText}>
                    {accountFor === 'family' ? 'Signing up for a Family Member' : 'Signing up for Myself'}
                  </Text>
                </View>
                <Text style={styles.title} accessibilityRole="header">Create your account</Text>
                <Text style={styles.subtitle}>
                  {accountFor === 'family'
                    ? 'Create your account first. You will add the meal recipient next.'
                    : 'Add your details to get started with F.I.L Foods.'}
                </Text>

                {banner.length > 0 ? <FormMessage messages={banner} /> : null}

                {accountFor === 'family' ? (
                  <>
                    <View style={styles.nameRow}>
                      <View style={styles.nameCol}>
                        <AppInput label="First name" value={form.firstName} onChangeText={set('firstName')} autoCapitalize="words" autoComplete="given-name" error={fields.firstName} errorSlot labelStyle={styles.pairLabel} fieldStyle={styles.input} />
                      </View>
                      <View style={styles.nameCol}>
                        <AppInput label="Middle name (optional)" value={form.middleName} onChangeText={set('middleName')} autoCapitalize="words" errorSlot labelStyle={styles.pairLabel} fieldStyle={styles.input} />
                      </View>
                    </View>
                    <View style={styles.nameRow}>
                      <View style={styles.nameCol}>
                        <AppInput label="Last name" value={form.lastName} onChangeText={set('lastName')} autoCapitalize="words" autoComplete="family-name" error={fields.lastName} errorSlot labelStyle={styles.pairLabel} fieldStyle={styles.input} />
                      </View>
                      <View style={styles.nameCol}>
                        <AppInput label="Suffix (optional)" value={form.suffix} onChangeText={set('suffix')} autoCapitalize="words" accessibilityLabel="Suffix, optional, for example Jr or III" errorSlot labelStyle={styles.pairLabel} fieldStyle={styles.input} />
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.nameRow}>
                      <View style={styles.nameCol}>
                        <AppInput label="First name" value={form.firstName} onChangeText={set('firstName')} autoCapitalize="words" autoComplete="given-name" error={fields.firstName} errorSlot labelStyle={styles.pairLabel} fieldStyle={styles.input} />
                      </View>
                      <View style={styles.nameCol}>
                        <AppInput label="Last name" value={form.lastName} onChangeText={set('lastName')} autoCapitalize="words" autoComplete="family-name" error={fields.lastName} errorSlot labelStyle={styles.pairLabel} fieldStyle={styles.input} />
                      </View>
                    </View>
                    <AppInput label="Suffix (optional)" value={form.suffix} onChangeText={set('suffix')} autoCapitalize="words" accessibilityLabel="Suffix, optional, for example Jr or III" placeholder="e.g. Jr., III" fieldStyle={styles.input} />
                  </>
                )}
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
                <View style={styles.legalRow}>
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
                </View>
                {fields.terms ? <Text style={styles.fieldError}>{fields.terms}</Text> : null}

                <View style={styles.footerRow}>
                  <AppButton title="Back" variant="outline" onPress={() => setShowForm(false)} color={colors.primary} style={styles.footerBtn} />
                  <AppButton title="Sign Up" onPress={onSignUp} loading={loading} disabled={!termsReady} color={colors.action} style={styles.footerBtn} />
                </View>
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
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.semibold, fontSize: font.xl, lineHeight: 30, color: colors.heading, textAlign: 'center', marginTop: spacing.lg },
  subtitle: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  termsLink: { minHeight: 44, justifyContent: 'center', flexShrink: 1 },
  legalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  backLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -4 },
  backLinkText: { fontFamily: fonts.medium, fontSize: font.body, color: colors.primary, marginLeft: 2 },
  termsLinkText: { fontFamily: fonts.regular, fontSize: font.body, color: colors.action, textDecorationLine: 'underline' },
  choice: {
    ...card,
    borderColor: colors.cardBorder,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.mint },
  choiceError: { borderColor: colors.danger },
  pressed: { opacity: 0.85 },
  choiceIcon: { width: 48, height: 48, borderRadius: 16, marginTop: 2, backgroundColor: colors.mintStrong, alignItems: 'center', justifyContent: 'center' },
  choiceIconOn: { backgroundColor: colors.primary },
  choiceCopy: { flex: 1 },
  choiceTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  choiceTag: { backgroundColor: colors.mintStrong, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  choiceTagLabel: { fontFamily: fonts.medium, fontSize: font.sm, color: colors.primary },
  choiceTagWarm: { backgroundColor: '#F8E7C9', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  choiceTagWarmLabel: { fontFamily: fonts.medium, fontSize: font.sm, color: '#8A5A12' },
  radio: { width: 28, height: 28, marginTop: 8, borderRadius: 14, borderWidth: 2, borderColor: colors.inactive, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  choiceTitle: { flex: 1, fontFamily: fonts.bold, color: colors.text, fontSize: font.body },
  stepTrack: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, paddingHorizontal: spacing.xl },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs, marginBottom: spacing.md },
  stepDotOn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  stepNumOn: { fontFamily: fonts.bold, fontSize: 14, color: colors.white },
  stepNum: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  stepLabelOn: { fontFamily: fonts.medium, fontSize: font.sm, color: colors.primary, textAlign: 'center', width: 120 },
  stepLabel: { fontFamily: fonts.regular, fontSize: font.sm, color: colors.muted, textAlign: 'center', width: 120 },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  signingBadge: { alignSelf: 'center', backgroundColor: colors.mint, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4, marginTop: spacing.sm },
  signingBadgeText: { fontFamily: fonts.medium, fontSize: font.sm, color: colors.primary },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.mint, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  noteText: { flex: 1, fontFamily: fonts.regular, fontSize: font.sm, lineHeight: 22, color: colors.text },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  nameCol: { flex: 1, minWidth: 0 },
  pairLabel: { minHeight: 44, lineHeight: 22 },
  footerRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  footerBtn: { flex: 1, marginTop: 0 },
  choiceDescription: { fontFamily: fonts.regular, color: colors.muted, fontSize: font.body, lineHeight: 24, marginTop: spacing.xs },
  fieldError: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 22, color: colors.danger, marginBottom: spacing.md },
  action: { marginTop: spacing.sm },
  loginLink: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.md },
  loginText: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.primary },
});
