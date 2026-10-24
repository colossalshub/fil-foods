import { Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import LogoPlaceholder from '../../components/LogoPlaceholder';
import VerificationFlow from '../../components/VerificationFlow';
import { getPublicUser } from '../../services/authService';
import { MSG } from '../../data/messages';
import { colors, font, spacing } from '../../theme/theme';

export default function VerifyAccountScreen({ navigation, route }) {
  const user = getPublicUser(route.params?.userId);

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <LogoPlaceholder />
          <Text style={styles.title} accessibilityRole="header">Verify your account</Text>
          {user ? (
            <>
              <Text style={styles.body}>
                {user.firstName}, enter the 6-digit code we send to your phone or email.
              </Text>
              <VerificationFlow
                userId={user.id}
                purpose="account"
                phone={user.contactNumber}
                email={user.email}
                successMessage={MSG.verified}
                successButtonTitle="Back to log in"
                onVerified={() => navigation.navigate('Login')}
              />
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
});
