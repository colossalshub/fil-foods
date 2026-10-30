import { useCallback, useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getAlertsForUser } from '../services/trackingService';
import { colors, font, radius } from '../theme/theme';

function openAlerts(navigation) {
  let nav = navigation;
  while (nav) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('Alerts')) {
      nav.navigate('Alerts');
      return;
    }
    if (Array.isArray(names) && names.includes('Account')) {
      nav.navigate('Account', { screen: 'Alerts' });
      return;
    }
    nav = nav.getParent?.();
  }
}

export default function NotificationBell() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const signedIn = !!user?.id && user.role !== 'visitor';

  useFocusEffect(
    useCallback(() => {
      if (!signedIn) {
        setUnreadCount(0);
        return undefined;
      }
      const alerts = getAlertsForUser(user.id);
      setUnreadCount(alerts.filter((item) => !item.read).length);
      return undefined;
    }, [signedIn, user?.id]),
  );

  if (!signedIn) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      onPress={() => openAlerts(navigation)}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <Ionicons name="notifications-outline" size={22} color={colors.primary} />
      {unreadCount > 0 ? (
        <Text style={styles.badge}>{unreadCount}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: font.xs,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
    overflow: 'hidden',
  },
});
