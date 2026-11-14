import type { ComponentProps } from 'react';
import { useContext, useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomTabBar,
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../theme/theme';

export const FLOATING_TAB_BAR_HEIGHT = 58;
const TAB_BOTTOM_GAP = spacing.md;
const SHADOW_BLEED = spacing.sm;

export const TAB_ROUTE_LABELS: Record<string, string> = {
  Home: 'Home',
  Meals: 'Meal',
  Orders: 'Orders',
  Account: 'Account',
};

const TAB_ROUTE_ICONS: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  Home: 'home',
  Meals: 'restaurant',
  Orders: 'receipt',
  Account: 'person',
};

function tabIcon(routeName: string, focused: boolean, color: string, size = 22) {
  const base = TAB_ROUTE_ICONS[routeName] ?? 'ellipse';
  const outline = `${String(base).replace(/-outline$/, '')}-outline` as ComponentProps<typeof Ionicons>['name'];
  const name = (focused ? base : outline) as ComponentProps<typeof Ionicons>['name'];
  return <Ionicons name={name} size={size} color={color} />;
}

export function floatingTabBottomInset(insets: EdgeInsets) {
  return FLOATING_TAB_BAR_HEIGHT + insets.bottom + TAB_BOTTOM_GAP + SHADOW_BLEED;
}

export function floatingTabScreenOptions(
  route: { name: string },
  insets: EdgeInsets,
): BottomTabNavigationOptions {
  return {
    headerShown: false,
    sceneStyle: { backgroundColor: 'transparent' },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.inactive,
    tabBarShowLabel: true,
    tabBarLabel: TAB_ROUTE_LABELS[route.name] ?? route.name,
    tabBarLabelStyle: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '600',
      marginTop: 2,
      marginBottom: 0,
    },
    tabBarIcon: ({ focused, color, size }) => tabIcon(route.name, focused, color, size ?? 22),
    tabBarItemStyle: {
      paddingVertical: 0,
    },
    tabBarStyle: {
      backgroundColor: 'transparent',
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      height: FLOATING_TAB_BAR_HEIGHT,
      paddingTop: spacing.xs,
      paddingBottom: 0,
    },
  };
}

/** Transparent overlay; only the inner pill is opaque so scrolling content shows underneath. */
export function FloatingTabBar(props: BottomTabBarProps) {
  const { insets } = props;
  const bottomGap = Math.max(insets.bottom, spacing.sm) + TAB_BOTTOM_GAP;
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);

  useLayoutEffect(() => {
    onHeightChange?.(0);
  }, [onHeightChange]);

  return (
    <View
      style={styles.shell}
      pointerEvents="box-none"
      onLayout={() => onHeightChange?.(0)}
    >
      <View style={[styles.pill, { marginBottom: bottomGap }]}>
        <BottomTabBar
          {...props}
          insets={{ ...insets, bottom: 0 }}
          style={styles.barMerge}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
  },
  pill: {
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadow,
    elevation: 16,
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  barMerge: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingHorizontal: 0,
  },
});