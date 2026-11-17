import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COPY } from '../copy.js';
import { markAllNoticesRead, markNoticeRead, noticesFor } from '../data/store.js';
import { formatWhen } from '../domain/format.js';
import { useAdmin } from '../context.js';
import { openRoot, type ScreenProps } from '../nav.js';
import { GreenHeader, PhoneFrame, PrimaryButton, useStoreRevision } from '../components.js';
import { Text } from '../ui/StaffText.js';

/** ADM-05 / DIT-05 / KIT-05 / DEL-05: the bell inbox, only items this role may open. */
export function NotificationsScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { session, colors, t } = useAdmin();
  if (!session) return null;
  const notices = noticesFor(session.role, session.id);
  const unread = notices.filter((notice) => !notice.readBy.includes(session.id)).length;
  return (
    <PhoneFrame>
      <GreenHeader
        title={t('notifications')}
        onBack={() => navigation.goBack()}
        right={unread ? (
          <Pressable accessibilityLabel="Mark all as read" onPress={() => markAllNoticesRead(session.role, session.id)}>
            <Ionicons name="checkmark-done-outline" size={22} color="#FFFFFF" />
          </Pressable>
        ) : undefined}
      />
      {notices.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-off-outline" size={40} color={colors.muted} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 17 }}>{COPY.caughtUp}</Text>
          <Text style={{ color: colors.muted }}>New updates will appear here.</Text>
          <PrimaryButton title="Back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {notices.map((notice) => {
            const isUnread = !notice.readBy.includes(session.id);
            return (
              <Pressable
                key={notice.id}
                accessibilityRole="button"
                onPress={() => {
                  markNoticeRead(session.id, notice.id);
                  if (notice.orderId) openRoot(navigation, 'OrderDetail', { id: notice.orderId });
                  else if (notice.requestId && session.role === 'dietitian') openRoot(navigation, 'RemovalRequest', { id: notice.requestId });
                }}
                style={[styles.row, { backgroundColor: isUnread ? colors.mint : colors.card, borderColor: colors.border }]}
              >
                <Ionicons name={notice.orderId ? 'receipt-outline' : notice.requestId ? 'medkit-outline' : 'restaurant-outline'} size={20} color={colors.green} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: isUnread ? '700' : '500' }}>{notice.title}</Text>
                  {notice.body ? <Text style={{ color: colors.muted, fontSize: 13 }}>{notice.body}</Text> : null}
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{formatWhen(notice.createdAt)}</Text>
                </View>
                {isUnread ? <View style={[styles.dot, { backgroundColor: colors.green }]} /> : null}
              </Pressable>
            );
          })}
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 8 }}>No more notifications</Text>
        </ScrollView>
      )}
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  row: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
