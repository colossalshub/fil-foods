import { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import AppButton from './AppButton';
import FormMessage from './FormMessage';
import {
  GOOGLE_OUTCOMES, PICKER_ACCOUNTS, continueWithGoogle,
} from '../services/googleAuthService';
import { MSG } from '../data/messages';
import { colors, font, radius, spacing } from '../theme/theme';

export default function GoogleSignIn({ accountFor = 'self', onSuccess, onLink, color, style, showDemo = false }) {
  const [outcome, setOutcome] = useState('new_user');
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (nextOutcome, profile) => {
    setMessage('');
    setLoading(true);
    const result = await continueWithGoogle({ outcome: nextOutcome, profile, accountFor });
    setLoading(false);
    if (result.ok) {
      onSuccess(result.user);
      return;
    }
    if (result.status === 'link') {
      onLink(result.google);
      return;
    }
    setMessage(result.message);
  };

  const onPress = () => {
    if (__DEV__ && outcome === 'account_picker') {
      setPicker(true);
      return;
    }
    // Release builds have no Google SDK, so the button reports the connection message.
    run(__DEV__ ? outcome : 'no_connection');
  };

  const selected = GOOGLE_OUTCOMES.find((item) => item.id === outcome);

  return (
    <View>
      <AppButton title="Continue with Google" variant="outline" onPress={onPress} loading={loading} color={color} style={style} />
      <FormMessage messages={message} />
      {__DEV__ && showDemo ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Google demo result ${selected?.label}`}
            onPress={() => setOpen(true)}
            style={styles.dev}
          >
            <Text style={styles.devText}>Google demo: {selected?.label}</Text>
          </Pressable>
          <Text style={styles.simNote}>
            Simulated Google sign-in. No Google request is made.
          </Text>
          <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
            <View style={styles.backdrop}>
              <View style={styles.sheet}>
                <Text style={styles.title}>Which Google result should run?</Text>
                {GOOGLE_OUTCOMES.map((item) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: item.id === outcome }}
                    accessibilityLabel={item.label}
                    onPress={() => { setOutcome(item.id); setOpen(false); }}
                    style={styles.choice}
                  >
                    <Text style={styles.choiceText}>{item.label}</Text>
                  </Pressable>
                ))}
                <AppButton title="Close" variant="outline" onPress={() => setOpen(false)} />
              </View>
            </View>
          </Modal>
          <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
            <View style={styles.backdrop}>
              <View style={styles.sheet}>
                <Text style={styles.title}>Choose a Google account</Text>
                {PICKER_ACCOUNTS.map((account) => (
                  <Pressable
                    key={account.sub}
                    accessibilityRole="button"
                    accessibilityLabel={account.email}
                    onPress={() => { setPicker(false); run('use_profile', account); }}
                    style={styles.choice}
                  >
                    <Text style={styles.choiceText}>{account.email}</Text>
                  </Pressable>
                ))}
                <AppButton title="Cancel" variant="outline" onPress={() => { setPicker(false); setMessage(MSG.googleCancelled); }} />
              </View>
            </View>
          </Modal>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dev: { minHeight: 48, justifyContent: 'center', marginBottom: spacing.sm },
  devText: { fontSize: font.sm, color: colors.muted, fontWeight: '700' },
  simNote: { fontSize: font.sm, color: colors.muted, lineHeight: 20, marginBottom: spacing.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, maxHeight: '80%' },
  title: { fontSize: font.lg, fontWeight: '700', color: colors.deep, marginBottom: spacing.md },
  choice: { minHeight: 48, justifyContent: 'center' },
  choiceText: { fontSize: font.md, color: colors.primary, fontWeight: '700' },
});
