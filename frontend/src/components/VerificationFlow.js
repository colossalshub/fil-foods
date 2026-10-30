import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AppInput from './AppInput';
import AppButton from './AppButton';
import FormMessage from './FormMessage';
import {
  activeCodeInfo, expireActiveCode, fillHourlyLimit, maskEmail, maskPhone,
  sendCode, setNextSendShouldFail, verifyCode,
} from '../services/verificationService';
import { verifyResetCode } from '../services/authService';
import { verifyContactChange } from '../services/profileService';
import { EMAIL_SUBJECT, EMAIL_TEMPLATE, SMS_TEMPLATE } from '../data/messages';
import { colors, font, radius, spacing } from '../theme/theme';

export default function VerificationFlow({
  userId, purpose, phone, email, autoChannel, successMessage, successButtonTitle = 'Continue',
  onVerified,
}) {
  const [channel, setChannel] = useState(autoChannel || null);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [messages, setMessages] = useState([]);
  const [tone, setTone] = useState('error');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const showExisting = (info) => {
    if (!info) return;
    setSent(true);
    setChannel(info.channel);
  };

  const request = async (nextChannel) => {
    setLoading(true);
    setTone('error');
    const result = await Promise.resolve(sendCode({ userId, channel: nextChannel, purpose }));
    setLoading(false);
    setChannel(nextChannel);
    if (!result.ok) {
      setMessages([result.message]);
      showExisting(activeCodeInfo(userId, purpose));
      return;
    }
    setSent(true);
    setCode('');
    setMessages([]);
  };

  useEffect(() => {
    if (!autoChannel) return;
    const timer = setTimeout(() => {
      const existing = activeCodeInfo(userId, purpose);
      if (existing) {
        showExisting(existing);
        return;
      }
      request(autoChannel);
    }, 0);
    return () => clearTimeout(timer);
    // Send once when a reset screen already chose SMS or email.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onVerify = () => {
    const result = purpose === 'reset'
      ? verifyResetCode({ userId, code })
      : purpose === 'contact'
        ? verifyContactChange({ userId, code })
        : verifyCode({ userId, purpose, code });
    if (!result.ok) {
      setTone('error');
      setMessages([result.message]);
      return;
    }
    if (purpose === 'reset') {
      onVerified(result.grantId);
      return;
    }
    if (purpose === 'contact' && result.complete === false) {
      onVerified(result);
      return;
    }
    if (successMessage) {
      setTone('ok');
      setMessages([successMessage]);
      setSuccess(true);
      return;
    }
    onVerified();
  };

  const otherChannel = channel === 'sms' ? 'email' : 'sms';
  const otherLabel = channel === 'sms' ? 'Send code by email instead' : 'Send code by SMS instead';

  if (success) {
    return (
      <View>
        <FormMessage messages={messages} tone="ok" />
        <AppButton title={successButtonTitle} onPress={onVerified} />
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.lead}>
        Choose where to send the 6-digit code. The number and email are partly hidden.
      </Text>
      <Text style={styles.mask}>SMS: {maskPhone(phone) || 'No contact number'}</Text>
      <Text style={styles.mask}>Email: {maskEmail(email) || 'No email address'}</Text>

      <View style={styles.dev} accessibilityRole="text">
        <Text style={styles.devTitle}>Demo: no SMS or email is delivered. Use code 123456.</Text>
        <Text style={styles.devBody}>SMS would say: {SMS_TEMPLATE}</Text>
        <Text style={styles.devBody}>Email subject: {EMAIL_SUBJECT}.</Text>
        <Text style={styles.devBody}>Email body: {EMAIL_TEMPLATE}</Text>
      </View>

      <FormMessage messages={messages} tone={tone} />

      {!sent ? (
        <>
          <AppButton title="Send code by SMS" onPress={() => request('sms')} loading={loading && channel === 'sms'} />
          <AppButton title="Send code by email" variant="outline" onPress={() => request('email')} loading={loading && channel === 'email'} />
        </>
      ) : (
        <>
          <AppInput
            label="6-digit code"
            accessibilityLabel="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
          <AppButton title="Verify" onPress={onVerify} />
          <AppButton title="Resend code" variant="outline" onPress={() => request(channel)} loading={loading} />
          <AppButton title={otherLabel} variant="outline" onPress={() => request(otherChannel)} />
        </>
      )}

      {__DEV__ ? (
        <View style={styles.devActions}>
          <DevLink title="Demo: expire current code" onPress={() => expireActiveCode(userId, purpose)} />
          <DevLink title="Demo: next send fails" onPress={() => setNextSendShouldFail(true)} />
          <DevLink
            title="Demo: fill hourly limit"
            onPress={() => fillHourlyLimit(userId, channel || 'sms', purpose)}
          />
          <Text style={styles.devBody}>
            Active attempts: {activeCodeInfo(userId, purpose)?.wrongAttempts ?? 0}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function DevLink({ title, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.devHit}>
      <Text style={styles.devLink}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: font.md, color: colors.text, marginBottom: spacing.sm, lineHeight: 22 },
  mask: { fontSize: font.md, color: colors.deep, fontWeight: '700', marginBottom: 4 },
  dev: { backgroundColor: '#FFF6D8', borderRadius: radius.md, padding: spacing.md, marginVertical: spacing.lg },
  devTitle: { fontSize: font.md, fontWeight: '700', color: colors.deep, marginBottom: 6 },
  devBody: { fontSize: font.sm, color: colors.text, lineHeight: 20, marginTop: 4 },
  devActions: { marginTop: spacing.md },
  devHit: { minHeight: 48, justifyContent: 'center' },
  devLink: { fontSize: font.md, color: colors.primary, fontWeight: '700' },
});
