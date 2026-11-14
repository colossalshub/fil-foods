import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AppPageShell from '../components/AppPageShell';
import HelpButton from '../components/HelpButton';
import { useAuth } from '../context/AuthContext';
import { NOTIFICATIONS_COPY } from '../data/messages';
import { getAlertsForUser, markAlertRead } from '../services/trackingService';
import { colors, card, font, radius, spacing, touch } from '../theme/theme';

type AlertItem = {
  id: string;
  kind: string;
  message?: string;
  read?: boolean;
  timeLabel?: string;
  orderId?: string;
  type?: string;
};

const FAMILY_ORDER_PATTERN = /^Order\s+\S+\s+for\s+.+\s+is\s+now\s+/i;

function alertIconName(item: AlertItem): keyof typeof Ionicons.glyphMap {
  if (item.kind === 'announcement') return 'megaphone-outline';
  const message = item.message || '';
  if (/cancelled/i.test(message)) return 'close-circle-outline';
  if (/payment|paid|awaiting payment/i.test(message)) return 'card-outline';
  if (/out for delivery|ready for delivery|dispatch/i.test(message)) return 'car-outline';
  if (/preparing|kitchen/i.test(message)) return 'restaurant-outline';
  if (/review|dietitian|approved/i.test(message)) return 'clipboard-outline';
  return 'notifications-outline';
}

function alertTag(item: AlertItem): { label: string; tone: 'family' | 'announcement' } | null {
  if (item.kind === 'announcement') {
    return { label: NOTIFICATIONS_COPY.tagAnnouncement, tone: 'announcement' };
  }
  if (item.message && FAMILY_ORDER_PATTERN.test(item.message)) {
    return { label: NOTIFICATIONS_COPY.tagFamilyMember, tone: 'family' };
  }
  return null;
}

function isCriticalAlert(item: AlertItem): boolean {
  return !!item.message && /cancelled|not approved/i.test(item.message);
}

function NotificationCard({
  item,
  onPress,
}: {
  item: AlertItem;
  onPress: () => void;
}) {
  const unread = !item.read;
  const critical = isCriticalAlert(item);
  const tag = alertTag(item);
  const icon = alertIconName(item);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${unread ? 'Unread: ' : ''}${item.message}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.notifCard,
        unread && !critical && styles.notifCardUnread,
        critical && styles.notifCardCritical,
        !unread && !critical && styles.notifCardRead,
        pressed && styles.notifCardPressed,
      ]}
    >
      {unread ? <View style={[styles.unreadDot, critical && styles.unreadDotCritical]} /> : null}
      <View style={styles.notifRow}>
        <View style={[styles.iconCircle, critical && styles.iconCircleCritical]}>
          <Ionicons
            name={icon}
            size={22}
            color={critical ? colors.danger : colors.primary}
          />
        </View>
        <View style={styles.notifBody}>
          {tag ? (
            <View
              style={[
                styles.tag,
                tag.tone === 'announcement' ? styles.tagAnnouncement : styles.tagFamily,
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  tag.tone === 'announcement' ? styles.tagTextAnnouncement : styles.tagTextFamily,
                ]}
              >
                {tag.label}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.notifMessage, unread && styles.notifMessageUnread]} allowFontScaling>
            {item.message}
          </Text>
          {item.timeLabel ? (
            <Text style={styles.notifTime} allowFontScaling>{item.timeLabel}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function AlertsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const userId = user?.id;
  const [items, setItems] = useState<AlertItem[]>([]);

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

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  const subtitle = unreadCount > 0
    ? NOTIFICATIONS_COPY.unreadSubtitle(unreadCount)
    : NOTIFICATIONS_COPY.screenSubtitle;

  const onOpen = (item: AlertItem) => {
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
    <AppPageShell edges={['top']} contentStyle={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toolsRow}>
          <HelpButton />
        </View>
        <Text style={styles.pageTitle} accessibilityRole="header" allowFontScaling>
          {NOTIFICATIONS_COPY.screenTitle}
        </Text>
        <Text style={styles.pageLead} allowFontScaling>{subtitle}</Text>

        {items.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="notifications-off-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle} allowFontScaling>{NOTIFICATIONS_COPY.emptyTitle}</Text>
            <Text style={styles.emptyBody} allowFontScaling>{NOTIFICATIONS_COPY.emptyBody}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <NotificationCard
                key={`${item.kind}-${item.id}`}
                item={item}
                onPress={() => onOpen(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </AppPageShell>
  );
}

const PAGE = {
  title: colors.heading,
  body: colors.text,
  muted: colors.muted,
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  pageTitle: {
    fontSize: font.title,
    lineHeight: 34,
    fontWeight: '800',
    color: PAGE.title,
  },
  pageLead: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    fontSize: font.body,
    lineHeight: 22,
    color: PAGE.muted,
  },
  list: { gap: spacing.md },
  notifCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    minHeight: touch.min,
    position: 'relative',
  },
  notifCardUnread: {
    backgroundColor: colors.mintStrong,
    borderColor: colors.mintBorder,
  },
  notifCardRead: {
    backgroundColor: colors.white,
    borderColor: colors.cardBorder,
  },
  notifCardCritical: {
    backgroundColor: '#FDECEC',
    borderColor: '#F2B8B5',
  },
  notifCardPressed: { opacity: 0.92 },
  unreadDot: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  unreadDotCritical: { backgroundColor: colors.danger },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleCritical: { backgroundColor: '#FCE4E4' },
  notifBody: { flex: 1, gap: spacing.xs, paddingRight: spacing.md },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginBottom: 2,
  },
  tagFamily: { backgroundColor: colors.mint },
  tagAnnouncement: { backgroundColor: '#FDF0D8' },
  tagText: { fontSize: font.sm, fontWeight: '700', lineHeight: 20 },
  tagTextFamily: { color: colors.primary },
  tagTextAnnouncement: { color: colors.warning },
  notifMessage: {
    fontSize: font.body,
    lineHeight: 22,
    color: PAGE.body,
    fontWeight: '500',
  },
  notifMessageUnread: { fontWeight: '700', color: colors.heading },
  notifTime: { fontSize: font.sm, lineHeight: 20, color: colors.inactive, marginTop: 2 },
  emptyCard: {
    ...card,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: font.lg,
    fontWeight: '800',
    color: PAGE.title,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: font.body,
    lineHeight: 22,
    color: PAGE.muted,
    textAlign: 'center',
  },
});