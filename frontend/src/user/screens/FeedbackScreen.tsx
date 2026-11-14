import { useState } from 'react';
import {
  View, Text, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BackPageShell from '../components/BackPageShell';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import { useAuth } from '../context/AuthContext';
import { FEEDBACK_COPY, MSG } from '../data/messages';
import { submitFeedback } from '../services/feedbackService';
import { openHelp } from '../navigation/openHelp';
import { colors, card, font, spacing, radius } from '../theme/theme';

export default function FeedbackScreen({ navigation }: {
  navigation: {
    navigate: (name: string, params?: object) => void;
    goBack: () => void;
    getState?: () => { routeNames?: string[] };
    getParent?: () => {
      navigate: (name: string, params?: object) => void;
      getState?: () => { routeNames?: string[] };
      getParent?: () => unknown;
    } | undefined;
  };
}) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = () => {
    setFieldError('');
    if (!user?.id || user.role === 'visitor') {
      setFieldError(MSG.guestGate);
      return;
    }
    const result = submitFeedback(String(user.id), comment);
    if (!result.ok) {
      setFieldError(result.message);
      return;
    }
    setComment('');
    setSubmitted(true);
  };

  const onBackToHelp = () => {
    openHelp(navigation as Parameters<typeof openHelp>[0]);
  };

  return (
    <BackPageShell
      title={FEEDBACK_COPY.title}
      onBack={() => navigation.goBack()}
      edges={['top', 'bottom']}
      avoidKeyboard
      scrollContentStyle={submitted ? styles.successScroll : undefined}
    >
      {submitted ? (
        <>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color={colors.white} />
          </View>
          <Text style={styles.successTitle} accessibilityRole="header" allowFontScaling>
            {FEEDBACK_COPY.thankYouTitle}
          </Text>
          <Text style={styles.successBody} allowFontScaling>
            {MSG.commentSubmitted}
          </Text>
          <AppButton
            title={FEEDBACK_COPY.backToHelp}
            onPress={onBackToHelp}
            style={styles.submitBtn}
          />
        </>
      ) : (
        <>
          <Text style={styles.subtitle} allowFontScaling>
            {FEEDBACK_COPY.subtitle}
          </Text>

          <View style={styles.formCard}>
            <AppInput
              label={FEEDBACK_COPY.fieldLabel}
              value={comment}
              onChangeText={(text) => {
                setComment(text);
                if (fieldError) setFieldError('');
              }}
              placeholder={FEEDBACK_COPY.placeholder}
              accessibilityLabel={FEEDBACK_COPY.fieldLabel}
              multiline
              textAlignVertical="top"
              fieldStyle={styles.textArea}
              style={styles.inputWrap}
              error={fieldError ? true : undefined}
            />
            {fieldError ? (
              <View style={styles.errorRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={20} color={colors.danger} />
                <Text style={styles.errorText} allowFontScaling>{fieldError}</Text>
              </View>
            ) : null}
            <AppButton
              title={FEEDBACK_COPY.submit}
              onPress={onSubmit}
              style={styles.submitBtn}
            />
          </View>
        </>
      )}
    </BackPageShell>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: font.body,
    lineHeight: 24,
    color: '#6B9B7A',
    fontWeight: '500',
    marginBottom: spacing.lg,
  },
  formCard: {
    ...card,
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  inputWrap: { marginBottom: spacing.sm },
  textArea: {
    alignItems: 'flex-start',
    minHeight: 160,
    paddingVertical: spacing.md,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    fontSize: font.body,
    lineHeight: 22,
    color: colors.danger,
    fontWeight: '600',
  },
  submitBtn: { marginTop: spacing.sm },
  successScroll: {
    flexGrow: 1,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  successTitle: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  successBody: {
    marginTop: spacing.md,
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});