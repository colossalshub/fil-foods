import React, {
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import AuthBackgroundDecor from './AuthBackgroundDecor';
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
    return node.map((child) => withTabScrollInset(child, inset));
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

  const items = Array.isArray(node) ? node : [node];
  const scrollIndex = items.findIndex(
    (child) => isValidElement(child) && child.type === ScrollView,
  );
  if (scrollIndex < 0) return node;

  let footerIndex = -1;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (i === scrollIndex) continue;
    const child = items[i];
    if (isValidElement(child) && child.type === View) {
      footerIndex = i;
      break;
    }
  }
  if (footerIndex < 0) return node;

  const patched = items.map((child, index) => {
    if (index !== footerIndex || !isValidElement(child)) return child;
    const footer = child as ReactElement<ViewProps>;
    const flat = StyleSheet.flatten(footer.props.style);
    const baseBottom = typeof flat?.paddingBottom === 'number' ? flat.paddingBottom : spacing.lg;
    return React.cloneElement(footer, {
      style: [footer.props.style, { paddingBottom: baseBottom + inset }],
    });
  });

  return Array.isArray(node) ? patched : patched[0];
}

export default function AppPageShell({ children, edges = ['top'], contentStyle }: AppPageShellProps) {
  const tabInset = useTabScrollInset();
  const content = withStickyFooterInset(withTabScrollInset(children, tabInset), tabInset);

  return (
    <View style={styles.page}>
      <View style={styles.root}>
        <AuthBackgroundDecor />
        <SafeAreaView edges={edges} style={[styles.safe, contentStyle]}>
          {content}
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.authPage,
    alignItems: 'center',
  },
  root: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    overflow: 'hidden',
    backgroundColor: colors.authPage,
  },
  safe: {
    flex: 1,
  },
  scrollFill: {
    flex: 1,
  },
});