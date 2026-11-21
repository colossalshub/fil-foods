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
import { EMAIL_SUBJECT, EMAIL_TEMPLATE, MSG, SMS_TEMPLATE } from '../data/messages';
import {
  liveSendBlock, newLiveCodeState, recordLiveSend, recordLiveWrong, sendContactEmailCode, sendLiveCode,
  verifyContactEmailCode, verifyLiveCode,
  LIVE_MAX_WRONG, type LiveCodeState,
} from '../services/liveAuthService';
import { colors, font, radius, spacing, fonts } from '../theme/theme';

export default function VerificationFlow({
  userId, purpose, phone, email, autoChannel, successMessage, successButtonTitle = 'Continue',
  onVerified, live, alreadySent,
}: {
  /** Live project: codes come from Supabase Auth by email (no SMS provider is configured). */
  live?: boolean;
  /** Supabase already emailed a sign-up code when the account was created. */
  alreadySent?: boolean;
  userId: string;
  purpose: string;
  phone?: string;
  email?: string;
  autoChannel?: string | null;
  successMessage?: string;
  successButtonTitle?: string;
  onVerified?: (result?: string | {
    grantId?: string;
    complete?: boolean;
    nextChannel?: string;
    phone?: string;
    email?: string;
  }) => void;
}) {
  const [channel, setChannel] = useState<string | null>(autoChannel || null);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [tone, setTone] = useState('error');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [liveState, setLiveState] = useState<LiveCodeState>(() => newLiveCodeState());
  const livePurpose = purpose === 'reset' ? 'reset' : 'account';
  const showExisting = (info: { channel?: string } | null) => {
    if (!info) return;
    setSent(true);
    setChannel(info.channel ?? null);
  };

  const requestLive = async (nextChannel: string) => {
    setChannel(nextChannel);
    setTone('error');
    if (nextChannel === 'email' && alreadySent && !liveState.sentAt.length) {
      // The sign-up email already carries the first code.
      setLiveState(recordLiveSend(liveState, Date.now()));
      setSent(true);
      setCode('');
      setMessages([]);
      return;
    }
    const blocked = nextChannel === 'email' ? liveSendBlock(liveState, Date.now()) : null;
    if (blocked) {
      setMessages([blocked]);
      return;
    }
    setLoading(true);
    const result = purpose === 'contact'
      ? await sendContactEmailCode(email)
      : await sendLiveCode(livePurpose, nextChannel, email);
    setLoading(false);
    if (!result.ok) {
      setMessages([result.message || MSG.sendFailed]);
      return;
    }
    setLiveState(recordLiveSend(liveState, Date.now()));
    setSent(true);
    setCode('');
    const sentNote = purpose === 'reset'
      ? MSG.checkEmailResetLink
      : purpose === 'account'
        ? MSG.checkEmailLink
        : '';
    setTone(sentNote ? 'ok' : 'error');
    setMessages(sentNote ? [sentNote] : []);
  };

  const request = async (nextChannel: string) => {
    if (live) {
      await requestLive(nextChannel);
      return;
    }
    setLoading(true);
    setTone('error');
    const result = await Promise.resolve(sendCode({ userId, channel: nextChannel, purpose }));
    setLoading(false);
    setChannel(nextChannel);
    if (!result.ok) {
      setMessages([result.message || '']);
      showExisting(activeCodeInfo(userId, purpose));
      return;
    }
    setSent(true);
    setCode('');
    setMessages([]);
  };

  useEffect(() => {
    if (!autoChannel || live) return;
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

  const onVerifyLive = async () => {
    if (liveState.wrong >= LIVE_MAX_WRONG) {
      setTone('error');
      setMessages([MSG.tooManyWrong]);
      return;
    }
    setLoading(true);
    const result = purpose === 'contact'
      ? await verifyContactEmailCode(email, code)
      : await verifyLiveCode(livePurpose, email, code);
    setLoading(false);
    if (!result.ok) {
      setTone('error');
      if (result.message === MSG.wrongCode) {
        const next = recordLiveWrong(liveState);
        setLiveState(next.state);
        setMessages([next.message]);
      } else {
        setMessages([result.message || MSG.wrongCode]);
      }
      return;
    }
    if (purpose === 'reset') {
      onVerified?.(result.grantId);
      return;
    }
    if (successMessage) {
      setTone('ok');
      setMessages([successMessage]);
      setSuccess(true);
      return;
    }
    onVerified?.();
  };

  const onVerify = () => {
    if (live) {
      void onVerifyLive();
      return;
    }
    const result = purpose === 'reset'
      ? verifyResetCode({ userId, code })
      : purpose === 'contact'
        ? verifyContactChange({ userId, code })
        : verifyCode({ userId, purpose, code });
    if (!result.ok) {
      setTone('error');
      setMessages([result.message || '']);
      return;
    }
    if (purpose === 'reset') {
      onVerified?.(result.grantId);
      return;
    }
    if (purpose === 'contact' && result.complete === false) {
      onVerified?.(result);
      return;
    }
    if (successMessage) {
      setTone('ok');
      setMessages([successMessage]);
      setSuccess(true);
      return;
    }
    onVerified?.();
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

      {live ? null : <View style={styles.dev} accessibilityRole="text">
        <Text style={styles.devTitle}>Demo: no SMS or email is delivered. Use code 123456.</Text>
        <Text style={styles.devBody}>SMS would say: {SMS_TEMPLATE}</Text>
        <Text style={styles.devBody}>Email subject: {EMAIL_SUBJECT}.</Text>
        <Text style={styles.devBody}>Email body: {EMAIL_TEMPLATE}</Text>
      </View>}

      <FormMessage messages={messages} tone={tone} />

      {!sent ? (
        <>
          <AppButton title="Send code by SMS" onPress={() => (live ? requestLive('sms') : request('sms'))} loading={loading && channel === 'sms'} />
          <AppButton title="Send code by email" variant="outline" onPress={() => (live ? requestLive('email') : request('email'))} loading={loading && channel === 'email'} />
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
          <AppButton title="Verify" onPress={onVerify} loading={live && loading} />
          <AppButton
            title="Resend code"
            variant="outline"
            onPress={() => (live ? requestLive(channel || 'email') : request(channel || ''))}
            loading={loading}
          />
          <AppButton title={otherLabel} variant="outline" onPress={() => (live ? requestLive(otherChannel) : request(otherChannel))} />
        </>
      )}

      {__DEV__ && !live ? (
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

function DevLink({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={styles.devHit}>
      <Text style={styles.devLink}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.regular, fontSize: font.md, color: colors.text, marginBottom: spacing.sm, lineHeight: 22 },
  mask: { fontFamily: fonts.bold, fontSize: font.md, color: colors.deep, marginBottom: 4 },
  dev: { backgroundColor: colors.accent, borderRadius: radius.md, padding: spacing.md, marginVertical: spacing.lg },
  devTitle: { fontFamily: fonts.bold, fontSize: font.md, color: colors.deep, marginBottom: 6 },
  devBody: { fontFamily: fonts.regular, fontSize: font.body, color: colors.heading, lineHeight: 24, marginTop: 4 },
  devActions: { marginTop: spacing.md },
  devHit: { minHeight: 48, justifyContent: 'center' },
  devLink: { fontFamily: fonts.bold, fontSize: font.md, color: colors.primary },
});
