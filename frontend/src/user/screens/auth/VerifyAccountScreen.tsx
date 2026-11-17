import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import HelpButton from '../../components/HelpButton';
import LogoPlaceholder from '../../components/LogoPlaceholder';
import AuthBackgroundDecor from '../../components/AuthBackgroundDecor';
import VerificationFlow from '../../components/VerificationFlow';
import EmailLinkPanel from '../../components/EmailLinkPanel';
import { useAuth } from '../../context/AuthContext';
import { continueAfterEmailConfirm } from '../../services/emailLinkAuth';
import { getPublicUser } from '../../services/authService';
import { MSG } from '../../data/messages';
import { colors, font, spacing, fonts } from '../../theme/theme';

export default function VerifyAccountScreen({ navigation, route }: {
  navigation: { replace: (name: string, params?: object) => void; navigate: (name: string, params?: object) => void };
  route: { params?: { userId?: string; live?: boolean; email?: string; phone?: string; firstName?: string; fromLogin?: boolean } };
}) {
  const params = route.params || {};
  const user = params.live && params.email
    ? { id: params.email, firstName: params.firstName || '', contactNumber: params.phone, email: params.email }
    : getPublicUser(params.userId);
  const { signIn } = useAuth();
  const [continuing, setContinuing] = useState(false);
  const [linkMessages, setLinkMessages] = useState<string[]>([]);

  // After tapping the email link (in the app, or on a web page): sign in with the password just entered.
  const onConfirmed = async () => {
    setLinkMessages([]);
    setContinuing(true);
    const result = await continueAfterEmailConfirm(params.email);
    setContinuing(false);
    if (result.ok) {
      await signIn(result.user, { session: result.session, keepLoggedIn: false });
      return;
    }
    if (result.needsLogin) {
      // No password in memory (came from Log in, or the app restarted): log in again.
      navigation.navigate('Login');
      return;
    }
    setLinkMessages([result.message || MSG.verifyFirst]);
  };

  const codeFlow = user ? (
    <VerificationFlow
      live={Boolean(params.live)}
      alreadySent={Boolean(params.live && !params.fromLogin)}
      userId={user.id}
      purpose="account"
      phone={user.contactNumber}
      email={user.email}
      successMessage={MSG.verified}
      successButtonTitle={params.live ? 'Continue' : 'Back to log in'}
      onVerified={() => (params.live ? void onConfirmed() : navigation.navigate('Login'))}
    />
  ) : null;

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <AuthBackgroundDecor />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.helpRow}>
            <HelpButton />
          </View>
          <LogoPlaceholder />
          <Text style={styles.title} accessibilityRole="header">Verify your account</Text>
          {user && params.live ? (
            <EmailLinkPanel
              purpose="account"
              email={user.email}
              lead={MSG.checkEmailLink}
              alreadySent={!params.fromLogin}
              onContinue={onConfirmed}
              continueLoading={continuing}
              messages={linkMessages}
              codeFlow={codeFlow}
            />
          ) : user ? (
            <>
              <Text style={styles.body}>
                {user.firstName ? `${user.firstName}, enter` : 'Enter'} the 6-digit code we send to your phone or email.
              </Text>
              {codeFlow}
            </>
          ) : (
            <>
              <Text style={styles.body}>
                This verification step is unavailable. Return to log in and create the account again.
              </Text>
              <AppButton
                title="Back to log in"
                variant="outline"
                color={colors.primary}
                onPress={() => navigation.navigate('Login')}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.authPage, alignItems: 'center' },
  flex: { flex: 1, width: '100%', maxWidth: 430 },
  scroll: {
    width: '100%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  helpRow: { alignItems: 'flex-end' },
  title: { fontFamily: fonts.bold, fontSize: font.xl, color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
  body: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.text, textAlign: 'center', marginTop: spacing.lg, marginBottom: spacing.lg },
});
