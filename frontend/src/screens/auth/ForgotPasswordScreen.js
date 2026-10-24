import { useState } from 'react';
import { Text, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LogoPlaceholder from '../../components/LogoPlaceholder';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import FormMessage from '../../components/FormMessage';
import SegmentedToggle from '../../components/SegmentedToggle';
import VerificationFlow from '../../components/VerificationFlow';
import { lookupPasswordReset } from '../../services/authService';
import { MSG } from '../../data/messages';
import { colors, font, spacing } from '../../theme/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [mode, setMode] = useState('contact');
  const [value, setValue] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [messages, setMessages] = useState([]);
  const [resetUser, setResetUser] = useState(null);

  const onContinue = () => {
    setMessages([]);
    const result = lookupPasswordReset({ mode, value });
    if (!result.ok) {
      setResetUser(null);
      if (result.message === MSG.invalidContact || result.message === MSG.invalidEmail) {
        setFieldError(result.message);
        setMessages([]);
      } else {
        setFieldError('');
        setMessages([result.message]);
      }
      return;
    }
    setFieldError('');
    setResetUser({ userId: result.userId, phone: result.phone, email: result.email });
  };

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LogoPlaceholder />
          <Text style={styles.title} accessibilityRole="header">Forgot password</Text>
          <Text style={styles.body}>
            Enter the contact number or email on your account, then choose SMS or email for your code.
          </Text>

          {resetUser ? (
            <VerificationFlow
              userId={resetUser.userId}
              purpose="reset"
              phone={resetUser.phone}
              email={resetUser.email}
              onVerified={(grantId) => navigation.navigate('NewPassword', { grantId })}
            />
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
              <AppButton title="Continue" onPress={onContinue} />
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
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page, alignItems: 'center' },
  flex: { flex: 1, width: '100%', maxWidth: 430 },
  scroll: {
    width: '100%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.lg },
  backLink: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  link: { fontSize: font.md, color: colors.secondary, fontWeight: '700' },
});
