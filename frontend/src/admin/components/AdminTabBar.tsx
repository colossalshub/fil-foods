import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/StaffText.js';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdmin } from '../context.js';

const ICONS = {
  Dashboard: 'home-outline',
  Orders: 'cart-outline',
  Menu: 'list-outline',
  Staff: 'people-outline',
  Settings: 'settings-outline',
} as const;

const ACTIVE = {
  Dashboard: 'home',
  Orders: 'cart',
  Menu: 'list',
  Staff: 'people',
  Settings: 'settings',
} as const;

export function AdminTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, t } = useAdmin();
  const labels: Record<string, string> = {
    Dashboard: t('dashboard'),
    Orders: t('orders'),
    Menu: t('menu'),
    Staff: t('staff'),
    Settings: t('settings'),
  };

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), borderTopColor: colors.border, backgroundColor: colors.card }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? colors.green : colors.muted;
        const iconName = focused
          ? ACTIVE[route.name as keyof typeof ACTIVE]
          : ICONS[route.name as keyof typeof ICONS];
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={labels[route.name] ?? route.name}
            onPress={onPress}
            style={styles.item}
          >
            {focused ? <View style={[styles.indicator, { backgroundColor: colors.green }]} /> : null}
            <Ionicons name={iconName} size={23} color={color} />
            <Text style={[styles.label, { color, fontWeight: focused ? '700' : '600' }]}>
              {labels[route.name] ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    minHeight: 58,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingTop: 4,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 28,
    height: 3,
    borderRadius: 2,
  },
  label: { fontSize: 11 },
});