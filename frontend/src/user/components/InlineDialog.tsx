import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

/**
 * An in-tree overlay for confirmations shown on top of a page (discard changes, remove
 * guardian, delete account, log out, ...). It is a plain absolutely-positioned View, not a
 * React Native Modal, so it appears immediately on top of whatever page it is rendered in,
 * including a page that is already inside an AppModal. React Native cannot reliably show a
 * second native Modal while one is visible (on iOS the second one waits until the first is
 * dismissed), so a dialog must never be its own Modal while a page modal is open.
 *
 * Render it as the LAST child of the page/host it should cover.
 */
export default function InlineDialog({ visible, children }: { visible: boolean; children: ReactNode }) {
  if (!visible) return null;
  return <DialogLayer>{children}</DialogLayer>;
}

/** Standard dialog entrance: fade in with a slight scale-up. */
function DialogLayer({ children }: { children: ReactNode }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    });
    anim.start();
    return () => anim.stop();
  }, [progress]);
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  return (
    <Animated.View style={[styles.overlay, { opacity: progress }]} accessibilityViewIsModal>
      <KeyboardAvoidingView behavior="padding" style={styles.fill}>
        <Animated.View style={[styles.fill, { transform: [{ scale }] }]}>{children}</Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, elevation: 100 },
  fill: { flex: 1 },
});
