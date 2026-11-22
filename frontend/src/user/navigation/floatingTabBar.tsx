import type { ComponentProps } from 'react';
import { useContext, useLayoutEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme/theme';

export const FLOATING_TAB_BAR_HEIGHT = 64;

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

function tabIcon(routeName: string, color: string, size = 22) {
  const base = TAB_ROUTE_ICONS[routeName] ?? 'ellipse';
  const name = `${String(base).replace(/-outline$/, '')}-outline` as ComponentProps<typeof Ionicons>['name'];
  return <Ionicons name={name} size={size} color={color} />;
}

export function floatingTabBottomInset(insets: EdgeInsets) {
  return FLOATING_TAB_BAR_HEIGHT + insets.bottom;
}

export function floatingTabScreenOptions(
  route: { name: string },
  _insets: EdgeInsets,
): BottomTabNavigationOptions {
  const label = TAB_ROUTE_LABELS[route.name] ?? route.name;
  return {
    headerShown: false,
    sceneStyle: { backgroundColor: 'transparent' },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.inactive,
    tabBarShowLabel: true,
    tabBarLabel: ({ focused, color }) => (
      <View style={styles.labelWrap}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        <View style={[styles.underline, focused && styles.underlineOn]} />
      </View>
    ),
    tabBarIcon: ({ color }) => tabIcon(route.name, color, 22),
    tabBarAccessibilityLabel: TAB_ROUTE_LABELS[route.name] ?? route.name,
    tabBarItemStyle: {
      flex: 1,
      paddingVertical: 0,
    },
    tabBarStyle: {
      backgroundColor: colors.white,
      borderTopWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      height: FLOATING_TAB_BAR_HEIGHT,
      paddingTop: 8,
      paddingBottom: 0,
    },
  };
}

/** Docked bar from the screen designs: full width, hairline top, underline on the selected tab. */
export function FloatingTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);

  useLayoutEffect(() => {
    onHeightChange?.(0);
  }, [onHeightChange]);

  return (
    <View style={styles.shell} pointerEvents="box-none">
      <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.inactive;
          const label = TAB_ROUTE_LABELS[route.name] ?? route.name;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={descriptors[route.key]?.options.tabBarAccessibilityLabel || label}
              onPress={onPress}
              style={styles.item}
            >
              {tabIcon(route.name, color)}
              <Text style={[styles.label, { color }]}>{label}</Text>
              <View style={[styles.underline, focused && styles.underlineOn]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: FLOATING_TAB_BAR_HEIGHT,
    paddingTop: 8,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 20,
    marginTop: 2,
  },
  underline: {
    marginTop: 4,
    height: 3,
    width: 28,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  underlineOn: { backgroundColor: colors.primary },
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  bar: {
    width: '100%',
    maxWidth: 430,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
  },
});