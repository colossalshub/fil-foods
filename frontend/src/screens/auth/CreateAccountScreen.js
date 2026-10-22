import { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import AuthLayout from '../../components/AuthLayout';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Checkbox from '../../components/Checkbox';
import { TermsModal } from '../../components/LegalModals';
import { register } from '../../services/authService';
import { colors, font } from '../../theme/theme';

const PH_NUMBER = /^(09|\+639)\d{9}$/;

export default function CreateAccountScreen({ navigation }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', contactNumber: '', username: '', password: '' });
  const [accepted, setAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!PH_NUMBER.test(form.contactNumber.replace(/\s/g, ''))) e.contactNumber = 'Use 09XXXXXXXXX or +639XXXXXXXXX';
    if (!/^\w{4,}$/.test(form.username)) e.username = 'At least 4 letters, numbers or _';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      e.password = 'At least 8 characters with a letter and a number';
    }
    if (!accepted) e.terms = 'You must accept the Terms and Conditions';
    return e;
  };

  const onRegister = async () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    const res = await register(form);
    setLoading(false);
    if (res.ok) {
      Alert.alert('Account created', 'You can now log in.', [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Join F.I.L. FOODS">
      <AppInput label="First name" value={form.firstName} onChangeText={set('firstName')} placeholder="First name" autoCapitalize="words" error={errors.firstName} />
      <AppInput label="Last name" value={form.lastName} onChangeText={set('lastName')} placeholder="Last name" autoCapitalize="words" error={errors.lastName} />
      <AppInput label="Contact number" value={form.contactNumber} onChangeText={set('contactNumber')} placeholder="09XXXXXXXXX" keyboardType="phone-pad" error={errors.contactNumber} />
      <AppInput label="Username" value={form.username} onChangeText={set('username')} placeholder="Username" error={errors.username} />
      <AppInput label="Password" value={form.password} onChangeText={set('password')} placeholder="Password" secure error={errors.password} />

      <Checkbox checked={accepted} onToggle={() => setAccepted((a) => !a)}>
        I accept the{' '}
        <Text style={styles.link} onPress={() => setShowTerms(true)}>Terms and Conditions</Text>
      </Checkbox>
      {errors.terms ? <Text style={styles.err}>{errors.terms}</Text> : null}

      <AppButton title="Create Account" onPress={onRegister} loading={loading} />
      <View style={styles.row}>
        <Text style={styles.muted}>Already have an account? </Text>
        <Pressable onPress={() => navigation.navigate('Login')}><Text style={[styles.link, { fontWeight: '700' }]}>Login</Text></Pressable>
      </View>

      <TermsModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        onAccept={() => { setAccepted(true); setShowTerms(false); }}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: font.sm, color: colors.secondary, textDecorationLine: 'underline' },
  err: { fontSize: font.xs, color: colors.danger, marginTop: -6, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  muted: { fontSize: font.sm, color: colors.muted },
});
