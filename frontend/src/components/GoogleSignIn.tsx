import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { AccountFor, AuthUser, PublicUser } from '../types';
import { Text, View } from 'react-native';
import { colors, font, spacing } from '../theme/theme';
import AppButton from './AppButton';
import FormMessage from './FormMessage';
import { continueWithGoogle } from '../services/supabaseGoogleAuthService';

export default function GoogleSignIn({ accountFor, onSuccess, color, style }: {
  accountFor?: AccountFor;
  onSuccess?: (user: AuthUser | PublicUser | null) => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);

  const onPress = async () => {
    setMessage('');
    setLoading(true);
    try {
      const result = await continueWithGoogle({ accountFor });
      if (result.ok) {
        onSuccess?.(result.user);
      } else if (result.status === 'needs_account_type' && result.user) {
        setPendingUser(result.user);
      } else {
        setMessage(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (pendingUser) {
    return (
      <View>
        <Text style={{ fontSize: font.body, color: colors.text, marginBottom: spacing.md }} accessibilityRole="header">
          Who is this meal subscription for?
        </Text>
        <AppButton
          title="Signing Up for Myself"
          onPress={() => onSuccess?.({ ...pendingUser, accountFor: 'self' })}
          color={color}
          style={style}
        />
        <AppButton
          title="Signing Up for a Family Member"
          variant="outline"
          onPress={() => onSuccess?.({ ...pendingUser, accountFor: 'family' })}
          color={color}
          style={style}
        />
      </View>
    );
  }

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
