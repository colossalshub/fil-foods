import { useEffect, useState } from 'react';
import AuthLayout from '../../components/AuthLayout';
import AppInput from '../../components/AppInput';
import AppButton from '../../components/AppButton';
import FormMessage from '../../components/FormMessage';
import { peekGrant, updatePassword } from '../../services/authService';
import { endLiveSession, updateLivePassword } from '../../services/liveAuthService';
import { setRecoveryMode } from '../../navigation/recoveryMode';

export default function NewPasswordScreen({ navigation, route }: {
  navigation: { replace: (name: string, params?: object) => void; navigate: (name: string, params?: object) => void };
  route: { params?: { grantId?: string; fromLink?: boolean } };
}) {
  const grantId = route.params?.grantId;
  const live = grantId === 'live';
  // Opened from the reset email link: the navigator shows only this screen until we leave it.
  const fromLink = Boolean(route.params?.fromLink);
  const leave = () => {
    if (fromLink) {
      if (!done) void endLiveSession();
      setRecoveryMode(false);
      return;
    }
    navigation.navigate(done ? 'Login' : 'ForgotPassword');
  };
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!live && !peekGrant(grantId)) navigation.replace('ForgotPassword');
  }, [grantId, live, navigation]);

  const onSave = async () => {
    setSaving(true);
    const result = live
      ? await updateLivePassword(password, confirm).finally(() => setSaving(false))
      : (setSaving(false), updatePassword({ grantId, password, confirmPassword: confirm }));
    if (result.code === 'no-grant') {
      navigation.replace('ForgotPassword');
      return;
    }
    if (!result.ok) {
      setMessages(result.messages || []);
      return;
    }
    setMessages([result.message || '']);
    setDone(true);
  };

  return (
    <AuthLayout variant="back" title="New password" onBack={leave}>
      <AppInput label="New password" value={password} onChangeText={setPassword} secure />
      <AppInput label="Re-type password" value={confirm} onChangeText={setConfirm} secure />
      <FormMessage messages={messages} tone={done ? 'ok' : 'error'} />
      {done ? (
        <AppButton title="Log in" onPress={leave} />
      ) : (
        <AppButton title="Update password" onPress={onSave} loading={saving} />
      )}
    </AuthLayout>
  );
}
