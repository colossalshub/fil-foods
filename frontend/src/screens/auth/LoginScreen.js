import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AuthLayout from '../../components/AuthLayout';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import Checkbox from '../../components/Checkbox';
import { useAuth } from '../../context/AuthContext';
import { login } from '../../services/authService';
import { colors, font } from '../../theme/theme';

export default function LoginScreen({ navigation }) {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(false); // not persisted yet (no storage)
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    const e = {};
    if (!username.trim()) e.username = 'Enter your username';
    if (!password) e.password = 'Enter your password';
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    const res = await login({ username: username.trim(), password });
    setLoading(false);
    if (res.ok) signIn(res.user);
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to manage your meals">
      <AppInput label="Username" value={username} onChangeText={setUsername} placeholder="Username" error={errors.username} />
      <AppInput label="Password" value={password} onChangeText={setPassword} placeholder="Password" secure error={errors.password} />
      <Checkbox checked={keep} onToggle={() => setKeep((k) => !k)}>Keep me logged in</Checkbox>
      <AppButton title="Login" onPress={onLogin} loading={loading} />
      <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.link}>
        <Text style={styles.linkText}>Forgot password?</Text>
      </Pressable>
      <View style={styles.row}>
        <Text style={styles.muted}>No account yet? </Text>
        <Pressable onPress={() => navigation.navigate('CreateAccount')}>
          <Text style={[styles.linkText, { fontWeight: '700' }]}>Create account</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', marginTop: 14 },
  linkText: { fontSize: font.sm, color: colors.secondary },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  muted: { fontSize: font.sm, color: colors.muted },
});
