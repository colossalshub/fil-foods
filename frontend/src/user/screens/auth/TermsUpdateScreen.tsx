import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import AuthLayout from '../../components/AuthLayout';
import AppButton from '../../components/AppButton';
import Checkbox from '../../components/Checkbox';
import FormMessage from '../../components/FormMessage';
import { TermsModal } from '../../components/LegalModals';
import { useAuth } from '../../context/AuthContext';
import { MSG } from '../../data/messages';
import { TERMS_LAST_UPDATED, TERMS_VERSION } from '../../data/terms';
import { acceptUpdatedTerms, logout } from '../../services/authService';
import { setLoginNotice } from '../../navigation/loginNotice';
import { colors, font, spacing } from '../../theme/theme';

export default function TermsUpdateScreen() {
  const { user, signIn, signOut } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [message, setMessage] = useState('');

  const onAccept = () => {
    if (!accepted) {
      setMessage(MSG.termsRequired);
      return;
    }
    if (!user?.id) return;
    const result = acceptUpdatedTerms(String(user.id));
    if (!result.ok || !result.user) {
      setMessage(result.message || MSG.acceptanceSaveFailed);
      return;
    }
    signIn(result.user, { keepLoggedIn: true });
  };

  const onDecline = () => {
    if (user?.id) logout(String(user.id));
    setLoginNotice(MSG.termsDeclined);
    signOut();
  };

  return (
    <AuthLayout variant="plain" title="Terms and Conditions">
      <Text style={styles.lead}>{MSG.termsUpdated}</Text>
      <Text style={styles.meta}>Version {TERMS_VERSION}</Text>
      <Text style={styles.meta}>Last updated {TERMS_LAST_UPDATED}</Text>
      <FormMessage messages={message} />
      <AppButton title="View Terms and Conditions" variant="outline" onPress={() => setShowTerms(true)} color={colors.primary} />
      <Checkbox checked={accepted} onToggle={() => setAccepted((value) => !value)} accessibilityLabel="I have read and agree to the Terms and Conditions">
        I have read and agree to the Terms and Conditions
      </Checkbox>
      <AppButton title="Accept" onPress={onAccept} color={colors.action} />
      <AppButton title="Decline" variant="outline" onPress={onDecline} color={colors.primary} style={styles.decline} />
      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} onAccept={() => { setAccepted(true); setShowTerms(false); }} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.md },
  meta: { fontSize: font.body, color: colors.muted, marginBottom: spacing.sm },
  decline: { marginTop: spacing.sm },
});
