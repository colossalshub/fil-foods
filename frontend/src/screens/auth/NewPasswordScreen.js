import { useEffect, useState } from 'react';
import AuthLayout from '../../components/AuthLayout';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import FormMessage from '../../components/FormMessage';
import { peekGrant, updatePassword } from '../../services/authService';

export default function NewPasswordScreen({ navigation, route }) {
  const grantId = route.params?.grantId;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [messages, setMessages] = useState([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!peekGrant(grantId)) navigation.replace('ForgotPassword');
  }, [grantId, navigation]);

  const onSave = () => {
    const result = updatePassword({ grantId, password, confirmPassword: confirm });
    if (result.code === 'no-grant') {
      navigation.replace('ForgotPassword');
      return;
    }
    if (!result.ok) {
      setMessages(result.messages);
      return;
    }
    setMessages([result.message]);
    setDone(true);
  };

  return (
    <AuthLayout variant="back" title="New password" onBack={() => navigation.navigate('ForgotPassword')}>
      <AppInput label="New password" value={password} onChangeText={setPassword} secure />
      <AppInput label="Re-type password" value={confirm} onChangeText={setConfirm} secure />
      <FormMessage messages={messages} tone={done ? 'ok' : 'error'} />
      {done ? (
        <AppButton title="Log in" onPress={() => navigation.navigate('Login')} />
      ) : (
        <AppButton title="Update password" onPress={onSave} />
      )}
    </AuthLayout>
  );
}
