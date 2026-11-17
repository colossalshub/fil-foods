// Supabase's default emails carry a link, not a code. This panel shows "check your email",
// a resend button with the USR-33 cooldown, and keeps the 6-digit code as a secondary path.
import { useState, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AppButton from './AppButton';
import FormMessage from './FormMessage';
import { maskEmail } from '../services/verificationService';
import {
  liveSendBlock, newLiveCodeState, recordLiveSend, sendLiveCode, type LiveCodeState,
} from '../services/liveAuthService';
import { MSG } from '../data/messages';
import { colors, font, spacing, fonts } from '../theme/theme';

export default function EmailLinkPanel({
  purpose, email, lead, alreadySent, continueTitle, onContinue, continueLoading, messages: outside, codeFlow,
}: {
  purpose: 'account' | 'reset';
  email?: string;
  lead: string;
  /** Supabase emailed the first link just now (sign-up, or the reset request). */
  alreadySent?: boolean;
  continueTitle?: string;
  onContinue?: () => void;
  continueLoading?: boolean;
  messages?: string[];
  /** The 6-digit code form, shown under "Have a code?". */
  codeFlow?: ReactNode;
}) {
  const [state, setState] = useState<LiveCodeState>(() => newLiveCodeState(alreadySent ? Date.now() : undefined));
  const [messages, setMessages] = useState<string[]>([]);
  const [tone, setTone] = useState<'ok' | 'error'>('error');
  const [sending, setSending] = useState(false);
  const [showCode, setShowCode] = useState(false);

  const resend = async () => {
    const blocked = liveSendBlock(state, Date.now());
    if (blocked) {
      setTone('error');
      setMessages([blocked]);
      return;
    }
    setSending(true);
    const result = await sendLiveCode(purpose, 'email', email);
    setSending(false);
    if (!result.ok) {
      setTone('error');
      setMessages([result.message || MSG.sendFailed]);
      return;
    }
    setState(recordLiveSend(state, Date.now()));
    setTone('ok');
    setMessages([MSG.linkResent]);
  };

  const shown = outside?.length ? outside : messages;
  const shownTone = outside?.length ? 'error' : tone;

  return (
    <View>
      <Text style={styles.lead}>{lead}</Text>
      {email ? <Text style={styles.mask}>Email: {maskEmail(email)}</Text> : null}
      <FormMessage messages={shown} tone={shownTone} />
      {onContinue ? (
        <AppButton title={continueTitle || "I've confirmed, continue"} onPress={onContinue} loading={continueLoading} />
      ) : null}
      <AppButton title="Resend email" variant="outline" onPress={resend} loading={sending} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Have a code?"
        onPress={() => setShowCode((open) => !open)}
        style={styles.codeToggle}
      >
        <Text style={styles.codeToggleText}>Have a code?</Text>
      </Pressable>
      {showCode ? <View style={styles.code}>{codeFlow}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { fontFamily: fonts.regular, fontSize: font.md, color: colors.text, marginBottom: spacing.sm, lineHeight: 22, textAlign: 'center' },
  mask: { fontFamily: fonts.bold, fontSize: font.md, color: colors.deep, marginBottom: spacing.sm, textAlign: 'center' },
  codeToggle: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  codeToggleText: { fontFamily: fonts.bold, fontSize: font.md, color: colors.primary },
  code: { marginTop: spacing.sm },
});
