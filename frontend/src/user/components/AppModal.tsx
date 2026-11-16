import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View, type ModalProps } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import AppButton from './AppButton';
import InlineDialog from './InlineDialog';
import { HELP_TEXT } from '../data/legal';
import { openHelp } from '../navigation/openHelp';
import { colors, font, fonts, radius, spacing } from '../theme/theme';
import { NESTED_MODAL_MESSAGE, noteModalClosed, noteModalOpened } from './modalGuard';

type ModalContextValue = { showHelp: () => void } | null;
const InModalContext = createContext<ModalContextValue>(null);

/** True inside an AppModal: the tab bar is covered, so pages need no tab-bar inset. */
export function useInModal() {
  return useContext(InModalContext) !== null;
}

/**
 * Inside an AppModal, the Help pill must not navigate: the Help screen would open behind
 * the modal. It shows Help on top of the modal instead (see AppModal).
 */
export function useModalHelp() {
  return useContext(InModalContext)?.showHelp ?? null;
}

/** Time to keep a closed modal mounted so its closing animation can finish. */
const UNMOUNT_DELAY_MS = 400;

/**
 * The one modal wrapper for the user app.
 *
 * - Safe area: the modal covers the whole window like the app itself (on Android it draws
 *   under the status and navigation bars, as the edge-to-edge app does), so pages inside
 *   pad themselves with the app root's already-measured insets (useSafeAreaInsets via
 *   context). Nothing is measured inside the modal, so headers never start under the
 *   clock or battery on a first open. (A native SafeAreaView or a nested provider measures
 *   the modal window itself and can read 0 or a mid-animation value on first open.)
 * - One at a time: React Native cannot reliably present a second native Modal while one is
 *   visible (iOS only shows it after the first is dismissed). So a view opened from inside
 *   a modal must be rendered inside that modal (a page layer, or InlineDialog for
 *   confirmations), never as another AppModal. In development, opening an AppModal while
 *   another is open, or rendering one inside another, logs NESTED_MODAL_MESSAGE.
 * - The modal is mounted only while open (plus its closing animation).
 */
export default function AppModal({
  visible = false,
  children,
  avoidKeyboard,
  onCloseAll,
  ...rest
}: ModalProps & {
  /** Closes the whole modal (every layer). Enables "Open Help page" from the Help sheet. */
  onCloseAll?: () => void;
  children?: ReactNode;
  /** Wrap the content in a KeyboardAvoidingView. Defaults to on for transparent dialogs;
   *  turn off when the content (pages with AppPageShell, InlineDialog) already avoids it. */
  avoidKeyboard?: boolean;
}) {
  const wrapForKeyboard = avoidKeyboard ?? Boolean(rest.transparent);
  const [mounted, setMounted] = useState(visible);

  const insideAnotherModal = useInModal();
  const navigation = useContext(NavigationContext);
  const [helpOpen, setHelpOpen] = useState(false);
  const contextValue = useMemo(() => ({ showHelp: () => setHelpOpen(true) }), []);
  if (!visible && helpOpen) setHelpOpen(false);

  // Mount as soon as it opens (state adjusted during render, not in an effect).
  if (visible && !mounted) setMounted(true);

  // Regression guard: never show two native modals at once (see modalGuard.ts).
  useEffect(() => {
    if (!visible) return undefined;
    if (insideAnotherModal && __DEV__) console.error(NESTED_MODAL_MESSAGE);
    noteModalOpened();
    return () => noteModalClosed();
  }, [visible, insideAnotherModal]);

  useEffect(() => {
    if (visible) return undefined;
    const timer = setTimeout(() => setMounted(false), UNMOUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible && !mounted) return null;

  return (
    <Modal visible={visible} statusBarTranslucent navigationBarTranslucent {...rest}>
      <InModalContext.Provider value={contextValue}>
        <View style={styles.fill}>
          {wrapForKeyboard ? (
            // Dialogs (e.g. the delete-account password) move up with the keyboard.
            // Full-screen modals get this from AppPageShell instead.
            <KeyboardAvoidingView behavior="padding" style={styles.fill}>{children}</KeyboardAvoidingView>
          ) : children}
          <InlineDialog visible={helpOpen}>
            <View style={styles.backdrop}>
              <View style={styles.sheet}>
                <Text style={styles.title} accessibilityRole="header">Help</Text>
                <ScrollView style={styles.helpScroll}>
                  <Text style={styles.body}>{HELP_TEXT}</Text>
                </ScrollView>
                {onCloseAll && navigation ? (
                  <AppButton
                    title="Open Help page"
                    onPress={() => {
                      setHelpOpen(false);
                      onCloseAll();
                      openHelp(navigation as Parameters<typeof openHelp>[0]);
                    }}
                    color={colors.primary}
                  />
                ) : null}
                <AppButton title="Close" variant="outline" onPress={() => setHelpOpen(false)} color={colors.primary} style={styles.gap} />
              </View>
            </View>
          </InlineDialog>
        </View>
      </InModalContext.Provider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, maxHeight: '80%' },
  title: { fontFamily: fonts.bold, fontSize: font.lg, color: colors.primary, marginBottom: spacing.md },
  helpScroll: { marginBottom: spacing.md },
  body: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.text },
  gap: { marginTop: spacing.sm },
});
