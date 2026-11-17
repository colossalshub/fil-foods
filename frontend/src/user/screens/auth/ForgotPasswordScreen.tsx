import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthBackgroundDecor from '../../components/AuthBackgroundDecor';
import HelpButton from '../../components/HelpButton';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import FormMessage from '../../components/FormMessage';
import SegmentedToggle from '../../components/SegmentedToggle';
import VerificationFlow from '../../components/VerificationFlow';
import { lookupPasswordReset } from '../../services/authService';
import { lookupLiveReset, sendLiveCode } from '../../services/liveAuthService';
import { noteResetRequested } from '../../services/emailLinkAuth';
import EmailLinkPanel from '../../components/EmailLinkPanel';
import { isSupabaseConfigured } from '../../../lib/supabaseClient';
import { MSG } from '../../data/messages';
import { colors, font, spacing, fonts } from '../../theme/theme';

export default function ForgotPasswordScreen({ navigation }: {
  navigation: { navigate: (name: string, params?: object) => void };
}) {
  const [mode, setMode] = useState('contact');
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [resetUser, setResetUser] = useState<{ userId: string; phone?: string; email?: string; linkSent?: boolean } | null>(null);

  const [checking, setChecking] = useState(false);
  const onContinue = async () => {
    setMessages([]);
    setChecking(true);
    const result = isSupabaseConfigured
      ? await lookupLiveReset(mode, value).finally(() => setChecking(false))
      : (setChecking(false), lookupPasswordReset({ mode, value }));
    if (!result.ok) {
      setResetUser(null);
      if (result.message === MSG.invalidContact || result.message === MSG.invalidEmail) {
        setFieldError(result.message || '');
        setMessages([]);
      } else {
        setFieldError('');
        setMessages([result.message || '']);
      }
      return;
    }
    setFieldError('');
    if (isSupabaseConfigured && result.email) {
      // Supabase's default reset email carries a link (USR-04); the code form stays under "Have a code?".
      setChecking(true);
      const sent = await sendLiveCode('reset', 'email', result.email);
      setChecking(false);
      if (!sent.ok) {
        setMessages([sent.message || MSG.sendFailed]);
        return;
      }
      noteResetRequested();
      setResetUser({ userId: '', email: result.email, linkSent: true });
      return;
    }
    setResetUser({ userId: result.userId || '', phone: result.phone, email: result.email });
  };

  const codeFlow = resetUser ? (
    <VerificationFlow
      live={isSupabaseConfigured}
      alreadySent={Boolean(resetUser.linkSent)}
      userId={resetUser.userId}
      purpose="reset"
      phone={resetUser.phone}
      email={resetUser.email}
      onVerified={(grantId) => navigation.navigate('NewPassword', { grantId })}
    />
  ) : null;

  return (
    <View style={styles.page}>
      <AuthBackgroundDecor />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.helpRow}>
              <HelpButton color={colors.primary} />
            </View>
            <Text style={styles.title} accessibilityRole="header">Forgot password</Text>
            {resetUser?.linkSent ? null : (
              <Text style={styles.body}>
                Enter the contact number or email on your account, then choose SMS or email for your code.
              </Text>
            )}

            {resetUser?.linkSent ? (
              <EmailLinkPanel
                purpose="reset"
                email={resetUser.email}
                lead={MSG.checkEmailResetLink}
                alreadySent
                codeFlow={codeFlow}
              />
            ) : resetUser ? (
              codeFlow
            ) : (
              <>
                <SegmentedToggle
                  label="Look up by"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'contact', label: 'Contact number' },
                    { value: 'email', label: 'Email' },
                  ]}
                />
                <AppInput
                  label={mode === 'contact' ? 'Contact number' : 'Email address'}
                  value={value}
                  onChangeText={setValue}
                  placeholder={mode === 'contact' ? '09XXXXXXXXX' : 'you@example.com'}
                  keyboardType={mode === 'contact' ? 'phone-pad' : 'email-address'}
                  autoCapitalize={mode === 'email' ? 'none' : 'sentences'}
                  error={fieldError}
                />
                <FormMessage messages={messages} tone="error" />
                <AppButton title="Continue" onPress={onContinue} loading={checking} />
              </>
            )}

            <Pressable
              accessibilityRole="link"
              onPress={() => navigation.navigate('Login')}
              style={styles.backLink}
            >
              <Text style={styles.link}>Back to login</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, width: '100%', maxWidth: 430, alignSelf: 'center', overflow: 'hidden', backgroundColor: colors.authPage },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  helpRow: { alignItems: 'flex-end' },
  title: { fontFamily: fonts.bold, fontSize: font.xl, color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
  body: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.text, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.lg },
  backLink: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  link: { fontFamily: fonts.bold, fontSize: font.md, color: colors.secondary },
});
