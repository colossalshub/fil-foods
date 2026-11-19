import React, {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useInModal } from './AppModal';
import { useTabScrollInset } from '../hooks/useTabScrollInset';
import { colors, spacing } from '../theme/theme';

type AppPageShellProps = {
  children: ReactNode;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

function withTabScrollInset(node: ReactNode, inset: number): ReactNode {
  if (!inset) return node;
  if (node == null || typeof node === 'boolean') return null;
  if (Array.isArray(node)) {
    return Children.map(node, (child) => withTabScrollInset(child, inset));
  }
  if (!isValidElement(node)) return node;

  if (node.type === ScrollView) {
    const scroll = node as ReactElement<ScrollViewProps>;
    const flat = StyleSheet.flatten(scroll.props.contentContainerStyle);
    const baseBottom = typeof flat?.paddingBottom === 'number' ? flat.paddingBottom : spacing.xxl;
    return React.cloneElement(scroll, {
      style: [scroll.props.style, styles.scrollFill],
      contentContainerStyle: [
        scroll.props.contentContainerStyle,
        { paddingBottom: baseBottom + inset },
      ],
    });
  }

  const { children: nested } = node.props as { children?: ReactNode };
  if (nested != null) {
    return React.cloneElement(node, {
      children: withTabScrollInset(nested, inset),
    } as { children: ReactNode });
  }

  return node;
}

/** Lift sticky footers (View siblings below a ScrollView) above the floating tab bar. */
function withStickyFooterInset(node: ReactNode, inset: number): ReactNode {
  if (!inset) return node;
  if (node == null || typeof node === 'boolean') return null;

  const items = Children.toArray(node);
  const scrollIndex = items.findIndex(
    (child) => isValidElement(child) && child.type === ScrollView,
  );
  if (scrollIndex < 0) return node;

  // Only a View *below* the ScrollView is a footer. A header above it (e.g. the
  // BackPageShell back row) must never get the tab-bar padding: that padding made a
  // large empty band under every sub-page title that scrolled content clipped against.
  let footerIndex = -1;
  for (let i = items.length - 1; i > scrollIndex; i -= 1) {
    const child = items[i];
    if (isValidElement(child) && child.type === View) {
      footerIndex = i;
      break;
    }
  }
  if (footerIndex < 0) return node;

  return Children.map(items, (child, index) => {
    if (index !== footerIndex || !isValidElement(child)) return child;
    const footer = child as ReactElement<ViewProps>;
    const flat = StyleSheet.flatten(footer.props.style);
    const baseBottom = typeof flat?.paddingBottom === 'number' ? flat.paddingBottom : spacing.lg;
    return React.cloneElement(footer, {
      style: [footer.props.style, { paddingBottom: baseBottom + inset }],
    });
  });
}

/**
 * Safe-area padding from the nearest SafeAreaProvider (the app root, or the modal's own
 * provider inside AppModal). Unlike the native SafeAreaView, these insets are known on the
 * first frame, so headers never start under the status bar on a first open.
 */
export function useSafeAreaPadding(edges: Edge[]): ViewStyle {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };
}

export default function AppPageShell({ children, edges = ['top'], contentStyle }: AppPageShellProps) {
  const inModal = useInModal();
  const tabScrollInset = useTabScrollInset();
  const tabInset = inModal ? 0 : tabScrollInset;
  const safePadding = useSafeAreaPadding(edges);
  const content = withStickyFooterInset(withTabScrollInset(children, tabInset), tabInset);

  return (
    <View style={styles.page}>
      <View style={styles.root}>
        <View style={[styles.safe, safePadding]}>
          {/* Expo apps are edge-to-edge on Android, so the window no longer resizes for the
              keyboard: "padding" on every platform keeps focused inputs above it. */}
          <KeyboardAvoidingView behavior="padding" style={styles.safe}>
            <View style={[styles.safe, contentStyle]}>{content}</View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.page,
    alignItems: 'center',
  },
  root: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    overflow: 'hidden',
    backgroundColor: colors.page,
  },
  safe: {
    flex: 1,
  },
  scrollFill: {
    flex: 1,
  },
});