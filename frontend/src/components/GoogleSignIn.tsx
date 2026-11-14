import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { AccountFor, AuthUser, PublicUser } from '../types';
import { View } from 'react-native';
import AppButton from './AppButton';
import FormMessage from './FormMessage';
import { continueWithGoogle } from '../services/supabaseGoogleAuthService';

export default function GoogleSignIn({ accountFor = 'self', onSuccess, color, style }: {
  accountFor?: AccountFor;
  onSuccess?: (user: AuthUser | PublicUser | null) => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const onPress = async () => {
    setMessage('');
    setLoading(true);
    try {
      const result = await continueWithGoogle({ accountFor });
      if (result.ok) {
        onSuccess?.(result.user);
      } else {
        setMessage(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <AppButton
        title="Continue with Google"
        variant="outline"
        onPress={onPress}
        loading={loading}
        color={color}
        icon="logo-google"
        iconColor="#4285F4"
        style={style}
      />
      <FormMessage messages={message} />
    </View>
  );
}
