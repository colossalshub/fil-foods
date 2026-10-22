import { useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import AuthLayout from '../../components/AuthLayout';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import { requestPasswordReset } from '../../services/authService';
import { colors, font } from '../../theme/theme';

const PH_NUMBER = /^(09|\+639)\d{9}$/;

export default function ForgotPasswordScreen({ navigation }) {
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onSend = async () => {
    setMessage('');
    if (!PH_NUMBER.test(contact.replace(/\s/g, ''))) {
      setError('Use 09XXXXXXXXX or +639XXXXXXXXX');
      return;
    }
    setError('');
    setLoading(true);
    await requestPasswordReset({ contactNumber: contact });
    setLoading(false);
    // Placeholder feedback: no real SMS is sent yet.
    setMessage('Code request recorded. SMS recovery is not enabled yet.');
  };

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your contact number and we'll send you a code">
      <AppInput label="Contact number" value={contact} onChangeText={setContact} placeholder="09XXXXXXXXX" keyboardType="phone-pad" error={error} />
      <AppButton title="Send Code" onPress={onSend} loading={loading} />
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <Pressable onPress={() => navigation.navigate('Login')} style={{ alignSelf: 'center', marginTop: 14 }}>
        <Text style={styles.link}>Back to login</Text>
      </Pressable>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  ok: { fontSize: font.sm, color: colors.secondary, backgroundColor: colors.tint, padding: 10, borderRadius: 8, marginTop: 12, overflow: 'hidden' },
  link: { fontSize: font.sm, color: colors.secondary },
});
