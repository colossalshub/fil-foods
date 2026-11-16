import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet } from 'react-native';

const IN_MS = 300;
const OUT_MS = 260;
/** How long a non-animated layer stays mounted while the host modal slides away. */
const HOST_EXIT_MS = 400;
const useNativeDriver = Platform.OS !== 'web';

/**
 * A full-screen page drawn inside an AppModal that slides up from the bottom when it
 * opens and back down when it closes (Back, or Android hardware Back), like a native
 * modal. It stays mounted during the exit animation, then unmounts.
 *
 * `animate` is false when this layer is the only page: then the host AppModal itself
 * slides (animationType "slide"), and the layer just stays put so the content does not
 * slide twice. It still stays mounted while the host slides down.
 */
export default function SlideLayer({ visible, animate, children }: {
  visible: boolean;
  animate: boolean;
  children?: ReactNode;
}) {
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  const [distance] = useState(() => Dimensions.get('window').height);

  // Mount as soon as it opens (state adjusted during render, not in an effect).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      if (!animate) {
        progress.setValue(1);
        return undefined;
      }
      progress.setValue(0);
      const anim = Animated.timing(progress, {
        toValue: 1,
        duration: IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver,
      });
      anim.start();
      return () => anim.stop();
    }
    if (!animate) {
      const timer = setTimeout(() => setMounted(false), HOST_EXIT_MS);
      return () => clearTimeout(timer);
    }
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: OUT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver,
    });
    anim.start(({ finished }) => {
      if (finished) setMounted(false);
    });
    return () => anim.stop();
    // `animate` is read at the moment visibility changes; it must not restart the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, progress]);

  if (!mounted) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });
  return (
    <Animated.View
      style={[styles.layer, { transform: [{ translateY }] }]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});
