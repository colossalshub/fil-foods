import { useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { AccountFor, AuthUser, PublicUser } from '../types';
import { Text, View } from 'react-native';
import { colors, font, spacing, fonts } from '../theme/theme';
import AppButton from './AppButton';
import AppInput from './AppInput';
import FormMessage from './FormMessage';
import { confirmGoogleLink, continueWithGoogle } from '../services/supabaseGoogleAuthService';
import { MSG } from '../data/messages';

export default function GoogleSignIn({ accountFor, onSuccess, color, style }: {
  accountFor?: AccountFor;
  onSuccess?: (user: AuthUser | PublicUser | null) => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingUser, setPendingUser] = useState<AuthUser | null>(null);
  const [linkUser, setLinkUser] = useState<AuthUser | null>(null);
  const [password, setPassword] = useState('');

  const onPress = async () => {
    setMessage('');
    setLoading(true);
    try {
      const result = await continueWithGoogle({ accountFor });
      if (result.ok) {
        onSuccess?.(result.user);
      } else if (result.status === 'needs_account_type' && result.user) {
        setPendingUser(result.user);
      } else if (result.status === 'needs_password_link' && result.user) {
        setLinkUser(result.user);
      } else {
        setMessage(result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const onConfirmLink = async () => {
    if (!linkUser?.email) return;
    setMessage('');
    setLoading(true);
    try {
      const result = await confirmGoogleLink(linkUser.email, password, String(linkUser.id));
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      onSuccess?.({
        ...linkUser,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      });
    } finally {
      setLoading(false);
    }
  };

  if (linkUser) {
    return (
      <View>
        <Text style={{ fontFamily: fonts.regular, fontSize: font.body, color: colors.text, marginBottom: spacing.md }}>
          {MSG.linkPrompt}
        </Text>
        <AppInput label="Password" value={password} onChangeText={setPassword} secure />
        <AppButton title={MSG.linkGoogleAction} onPress={onConfirmLink} loading={loading} color={color} style={style} />
        <FormMessage messages={message} />
      </View>
    );
  }

  if (pendingUser) {
    return (
      <View>
        <Text style={{ fontFamily: fonts.regular, fontSize: font.body, color: colors.text, marginBottom: spacing.md }} accessibilityRole="header">
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
