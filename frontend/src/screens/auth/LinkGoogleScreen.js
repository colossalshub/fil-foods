import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import AuthLayout from '../../components/AuthLayout';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import FormMessage from '../../components/FormMessage';
import { useAuth } from '../../context/AuthContext';
import { linkGoogleAccount } from '../../services/authService';
import { MSG } from '../../data/messages';
import { colors, font, spacing } from '../../theme/theme';

export default function LinkGoogleScreen({ navigation, route }) {
  const { signIn } = useAuth();
  const google = route.params?.google;
  const keepLoggedIn = route.params?.keepLoggedIn ?? false;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState([MSG.linkPrompt]);
  const [tone, setTone] = useState('error');
  const [linked, setLinked] = useState(null);
  const [loading, setLoading] = useState(false);
  const cancel = () => navigation.navigate('Login');

  if (!google?.sub) {
    return (
      <AuthLayout variant="back" title="Link Google account" onBack={cancel}>
        <FormMessage messages={MSG.googleCancelled} />
        <AppButton title="Back to login" onPress={cancel} />
      </AuthLayout>
    );
  }

  const onLink = async () => {
    if (!username.trim() || !password) {
      setTone('error');
      setMessages([MSG.required]);
      return;
    }
    setLoading(true);
    const result = await linkGoogleAccount({ username: username.trim(), password, google });
    setLoading(false);
    if (!result.ok) {
      setTone('error');
      setMessages([result.message]);
      if (result.status === 'unverified') {
        navigation.navigate('VerifyAccount', { userId: result.userId, purpose: 'account' });
      }
      return;
    }
    setTone('ok');
    setMessages([result.message]);
    setLinked(result.user);
  };

  return (
    <AuthLayout variant="back" title="Link Google account" onBack={cancel}>
      <Text style={styles.email}>{google?.email}</Text>
      <FormMessage messages={messages} tone={tone} />
      {linked ? (
        <AppButton title="Continue" onPress={() => signIn(linked, { keepLoggedIn })} />
      ) : (
        <>
          <AppInput label="Username" value={username} onChangeText={setUsername} />
          <AppInput label="Password" value={password} onChangeText={setPassword} secure />
          <AppButton title="Link account" onPress={onLink} loading={loading} />
          <AppButton title="Forgot password?" variant="outline" onPress={() => navigation.navigate('ForgotPassword')} />
          <AppButton title="Cancel" variant="outline" onPress={cancel} />
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  email: { fontSize: font.md, color: colors.deep, fontWeight: '700', marginBottom: spacing.md },
});
