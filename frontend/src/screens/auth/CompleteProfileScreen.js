import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import AuthLayout from '../../components/AuthLayout';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Checkbox from '../../components/Checkbox';
import FormMessage from '../../components/FormMessage';
import { TermsModal } from '../../components/LegalModals';
import { useAuth } from '../../context/AuthContext';
import { completeProfile, logout } from '../../services/authService';
import { colors, font, spacing } from '../../theme/theme';

export default function CompleteProfileScreen() {
  const { user, keepLoggedIn, signIn, signOut } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [contactNumber, setContactNumber] = useState(user?.contactNumber || '');
  const [accepted, setAccepted] = useState(!!user?.termsAcceptedAt);
  const [showTerms, setShowTerms] = useState(false);
  const [messages, setMessages] = useState([]);
  const [fields, setFields] = useState({});

  const leave = () => {
    if (user?.id) logout(user.id);
    signOut();
  };

  const onSave = () => {
    const result = completeProfile(user.id, {
      firstName, lastName, contactNumber, acceptedTerms: accepted,
    });
    if (!result.ok) {
      setMessages(result.messages);
      setFields(result.fields);
      return;
    }
    signIn(result.user, { keepLoggedIn });
  };

  return (
    <AuthLayout variant="back" title="Complete profile" onBack={leave}>
      <Text style={styles.lead}>
        Add the contact number for the person who will get the meals. The menu stays closed until this is saved.
      </Text>
      <AppInput label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" error={!!fields.firstName} />
      <AppInput label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" error={!!fields.lastName} />
      <AppInput label="Email address" value={user?.email || ''} editable={false} accessibilityLabel="Email address, already verified" />
      <AppInput label="Contact number" value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" error={!!fields.contactNumber} />
      <Checkbox
        checked={accepted}
        onToggle={() => setAccepted((value) => !value)}
        accessibilityLabel="I accept the Terms and Conditions"
        labelToggles={false}
      >
        I accept the{' '}
        <Text style={styles.link} onPress={() => setShowTerms(true)} accessibilityRole="link">
          Terms and Conditions
        </Text>
      </Checkbox>
      <FormMessage messages={messages} />
      <AppButton title="Save and continue" onPress={onSave} />
      <TermsModal visible={showTerms} onClose={() => setShowTerms(false)} onAccept={() => { setAccepted(true); setShowTerms(false); }} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: font.md, color: colors.text, lineHeight: 22, marginBottom: spacing.lg },
  link: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
});
