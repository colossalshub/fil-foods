import type { ReactNode } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { type Edge } from 'react-native-safe-area-context';
import AppPageShell from './AppPageShell';
import BackHeader from './BackHeader';
import { spacing } from '../theme/theme';

type BackPageShellProps = {
  title: string;
  onBack: () => void;
  children: ReactNode;
  /** Optional line under the title (e.g. who the page is for, USR-46). */
  subtitle?: string | null;
  /** Text next to the back arrow. Defaults to "Back". */
  backLabel?: string;
  edges?: Edge[];
  scroll?: boolean;
  scrollContentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  /** Replaces the default Help control on the right of the back row. */
  trailing?: ReactNode;
  /** Hide the Help control (only for the Help page itself). */
  showHelp?: boolean;
  avoidKeyboard?: boolean;
};

/**
 * Sub-page layout from the design guide: a back link and the Help pill on the botanical
 * background, then a left-aligned page title. Matches the tab pages so every screen shares
 * one header language.
 */
export default function BackPageShell({
  title,
  onBack,
  children,
  subtitle,
  backLabel = 'Back',
  edges = ['top'],
  scroll = true,
  scrollContentStyle,
  footer,
  trailing,
  showHelp = true,
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
      <View style={styles.header}>
        <BackHeader
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          backLabel={backLabel}
          trailing={trailing}
          showHelp={showHelp}
        />
      </View>
      {wrapped}
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.xxl, flexGrow: 1 },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.xxl },
});
