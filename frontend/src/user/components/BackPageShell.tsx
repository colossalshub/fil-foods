import type { ReactNode } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { type Edge } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from './AppPageShell';
import { colors, font, spacing, touch } from '../theme/theme';

type BackPageShellProps = {
  title: string;
  onBack: () => void;
  children: ReactNode;
  edges?: Edge[];
  scroll?: boolean;
  scrollContentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  trailing?: ReactNode;
  avoidKeyboard?: boolean;
};

export default function BackPageShell({
  title,
  onBack,
  children,
  edges = ['top'],
  scroll = true,
  scrollContentStyle,
  footer,
  trailing,
  avoidKeyboard = false,
}: BackPageShellProps) {
  const scrollBody = (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[styles.scroll, scrollContentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
      {footer}
    </ScrollView>
  );

  const staticBody = (
    <View style={[styles.body, scrollContentStyle]}>
      {children}
      {footer}
    </View>
  );

  const body = scroll ? scrollBody : staticBody;

  const wrapped = avoidKeyboard ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  ) : body;

  return (
    <AppPageShell edges={edges} contentStyle={styles.shell}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={styles.backHit}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
          <Text style={styles.backText} allowFontScaling>Back</Text>
        </Pressable>
        <Text style={styles.barTitle} accessibilityRole="header" allowFontScaling>{title}</Text>
        {trailing ? (
          <View style={styles.trailing}>{trailing}</View>
        ) : (
          <View style={styles.backSpacer} />
        )}
      </View>
      {wrapped}
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backHit: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: touch.min,
    minHeight: touch.min,
    paddingRight: spacing.sm,
  },
  backSpacer: { minWidth: touch.min },
  trailing: { minWidth: touch.min, alignItems: 'flex-end', justifyContent: 'center' },
  backText: { fontSize: font.body, color: colors.primary, fontWeight: '600', marginLeft: 4 },
  barTitle: { flex: 1, textAlign: 'center', fontSize: font.xl, fontWeight: '700', color: colors.primary },
  scrollView: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl, flexGrow: 1 },
  body: { flex: 1, padding: spacing.xl, paddingBottom: spacing.xxl },
});