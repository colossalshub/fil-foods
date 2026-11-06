import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import HelpButton from '../components/HelpButton';
import { useAuth } from '../context/AuthContext';
import { getAlertsForUser, markAlertRead } from '../services/trackingService';
import { colors, card, font, spacing, touch } from '../theme/theme';

export default function AlertsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const userId = user?.id;
  const [items, setItems] = useState([]);

  const reload = useCallback(() => {
    if (!userId) {
      setItems([]);
      return;
    }
    setItems(getAlertsForUser(userId));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const backToAccount = () => {
    const routes = navigation.getState()?.routes ?? [];
    if (routes.some((route) => route.name === 'AccountMain')) {
      navigation.navigate('AccountMain');
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'AccountMain' }] });
  };

  const onOpen = (item) => {
    if (!userId) return;
    markAlertRead(userId, item.kind, item.id);
    reload();
    if (item.orderId) {
      navigation.getParent()?.navigate('Orders', {
        screen: 'OrderDetail',
        params: { orderId: item.orderId },
      });
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to account"
          onPress={backToAccount}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
          <Text style={styles.backText}>Account</Text>
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <HelpButton />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>You&apos;re all caught up. Notifications will appear here.</Text>
          </View>
        ) : (
          items.map((item) => (
            <Pressable
              key={`${item.kind}-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${item.read ? '' : 'Unread: '}${item.message}`}
              onPress={() => onOpen(item)}
              style={[styles.row, !item.read && styles.unreadRow]}
            >
              <View style={styles.rowHead}>
                {!item.read ? <Text style={styles.unreadTag}>Unread</Text> : null}
                <Text style={styles.kind}>
                  {item.kind === 'announcement' ? 'Announcement' : 'Order update'}
                </Text>
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{item.timeLabel}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min,
    minWidth: touch.min,
    paddingRight: spacing.sm,
  },
  backText: { fontSize: font.body, color: colors.primary, fontWeight: '600' },
  title: { flex: 1, textAlign: 'center', fontSize: font.lg, fontWeight: '700', color: colors.primary },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  emptyCard: { ...card, padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: font.body, color: colors.muted, textAlign: 'center' },
  row: { ...card, padding: spacing.lg, minHeight: touch.min, gap: spacing.xs },
  unreadRow: { borderColor: colors.primary, borderWidth: 2 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unreadTag: { fontSize: font.sm, fontWeight: '700', color: colors.primary },
  kind: { fontSize: font.sm, color: colors.muted, fontWeight: '600' },
  message: { fontSize: font.body, color: colors.text },
  time: { fontSize: font.sm, color: colors.muted },
});
