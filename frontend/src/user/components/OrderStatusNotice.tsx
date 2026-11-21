import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { NOTIFICATIONS_COPY } from '../data/messages';
import { FLOATING_TAB_BAR_HEIGHT } from '../navigation/floatingTabBar';
import {
  POLL_INTERVAL_MS,
  loadAlertsForUser,
  subscribeToBackendOrderChanges,
} from '../services/trackingService';
import { colors, font, radius, spacing, fonts } from '../theme/theme';

type Notice = { id: string; message: string };

function latestStatusNotice(items: Array<{ id?: string; message?: string; read?: boolean; type?: string }>): Notice | null {
  const next = items.find((item) => !item.read && item.type === 'status_changed' && item.message);
  if (!next?.id || !next.message) return null;
  return { id: next.id, message: next.message };
}

/** USR-24: a status change is shown in the app, without opening the order page. */
export default function OrderStatusNotice() {
  const { user } = useAuth();
  const navigation = useNavigation<{ navigate: (name: string, params?: object) => void }>();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<Notice | null>(null);

  const reload = useCallback(() => {
    const userId = user?.id;
    if (!userId) {
      setNotice(null);
      return;
    }
    loadAlertsForUser(userId)
      .then((items) => setNotice(latestStatusNotice(items)))
      .catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    reload();
    const stop = subscribeToBackendOrderChanges(reload);
    const timer = setInterval(reload, POLL_INTERVAL_MS);
    return () => {
      stop();
      clearInterval(timer);
    };
  }, [reload]);

  if (!notice) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${NOTIFICATIONS_COPY.orderUpdate}. ${notice.message}`}
      onPress={() => navigation.navigate('Account', { screen: 'Alerts' })}
      style={[styles.wrap, { bottom: insets.bottom + FLOATING_TAB_BAR_HEIGHT + spacing.md }]}
    >
      <View style={styles.card}>
        <Text style={styles.label}>{NOTIFICATIONS_COPY.orderUpdate}</Text>
        <Text style={styles.message}>{notice.message}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 2,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: font.sm,
    lineHeight: 20,
    color: colors.primary,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: font.md,
    lineHeight: 22,
    color: colors.text,
  },
});
