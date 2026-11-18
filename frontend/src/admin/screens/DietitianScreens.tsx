import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from '../copy.js';
import {
  adminView,
  decideRemovalAsync,
  loadRemovalRequest,
  noticesFor,
  removalRequest,
  removalRequests,
  reviewOrderAsync,
} from '../data/store.js';
import { formatWhen, peso } from '../domain/format.js';
import { ALLERGY_CHIPS, allergyCounts, preferredLevels } from '../domain/dietitian.js';
import { photoKeyFor } from '../../lib/staffBackend.js';
import { useAdmin } from '../context.js';
import { openRoot, type ScreenProps } from '../nav.js';
import { ConfirmCard, FlashBanner, GreenHeader, PhoneFrame, PrimaryButton, useStoreRevision } from '../components.js';
import { BrandCard, Card, Chip, EmptyState, OrderPhoto, PreferencesPanel, ReasonModal, Section } from '../ui/blocks.js';
import { Text } from '../ui/StaffText.js';
import { useActor, useRefresh } from './OrdersScreen.js';
import type { AdminOrder, RemovalRequest } from '../types.js';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Figma role dashboard header: icon tile, role title, subtitle and the bell with an unread dot. */
export function RoleDashboardHeader({
  icon,
  title,
  subtitle,
  unread,
  onBell,
}: {
  icon: IconName | ReactNode;
  title: string;
  subtitle: string;
  unread: number;
  onBell: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAdmin();
  return (
    <View style={[styles.header, { backgroundColor: colors.header, paddingTop: insets.top + 12 }]}>
      {typeof icon === 'string' ? <Ionicons name={icon as IconName} size={34} color="#FFFFFF" /> : icon}
      <View style={styles.flex}>
        <Text style={styles.headerTitle} accessibilityRole="header">{title}</Text>
        <Text style={styles.headerSub}>{subtitle}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        onPress={onBell}
        style={styles.bell}
      >
        <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        {unread ? <View style={styles.dot} /> : null}
      </Pressable>
    </View>
  );
}

function Tile({ icon, title, subtitle, onPress, badge }: { icon: IconName; title: string; subtitle: string; onPress: () => void; badge?: number }) {
  const { colors } = useAdmin();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title} ${subtitle}`}
      onPress={onPress}
      style={[styles.tile, { backgroundColor: colors.mint, borderColor: colors.border }]}
    >
      <Ionicons name={icon} size={30} color={colors.text} />
      <View style={styles.flex}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: colors.green, fontSize: 12 }}>{subtitle}</Text>
      </View>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: '#D76566' }]}>
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** DIT-10 / DIT-17: Dashboard with Allergies, Customer Preferences, removal requests and Menu Overview. */
export function DietitianDashboardScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors, session } = useAdmin();
  const insets = useSafeAreaInsets();
  const actor = useActor();
  const { refreshing, onRefresh, enabled } = useRefresh();
  if (!actor) return null;
  const data = adminView();
  const unread = noticesFor('dietitian', session?.id).filter((notice) => !notice.readBy.includes(session?.id ?? '')).length;
  const pendingRemovals = removalRequests('pending').length;
  const toReview = data.orders.filter((order) => order.status === 'For Dietitian Review').length;
  const menu = data.menu.filter((item) => item.available).slice(0, 6);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.page }}
      contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
      refreshControl={enabled ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
    >
      <RoleDashboardHeader
        icon="heart"
        title="Dietitian"
        subtitle="Nutrition Specialist"
        unread={unread}
        onBell={() => openRoot(navigation, 'Inbox')}
      />
      <View style={styles.body}>
        <FlashBanner />
        <View>
          <Text style={[styles.greeting, { color: colors.text }]} accessibilityRole="header">Welcome back, Dietitian!</Text>
          <Text style={{ color: colors.muted }}>Here&apos;s an overview of your nutrition insights.</Text>
        </View>
        <View style={styles.row}>
          <Tile icon="warning-outline" title="Allergies" subtitle="View Only" onPress={() => navigation.navigate('AllergiesPrefs')} />
          <Tile icon="heart-outline" title="Customer" subtitle="Preferences" onPress={() => navigation.navigate('Customers')} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Condition Removal Requests, ${pendingRemovals} pending`}
          onPress={() => openRoot(navigation, 'RemovalRequests')}
          style={[styles.wide, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="medkit-outline" size={24} color={colors.green} />
          <View style={styles.flex}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Condition Removal Requests</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{pendingRemovals ? `${pendingRemovals} pending · Oldest first` : 'No pending requests'}</Text>
          </View>
          {pendingRemovals ? <View style={[styles.badge, { backgroundColor: '#D76566' }]}><Text style={styles.badgeText}>{pendingRemovals}</Text></View> : null}
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Orders for review, ${toReview} waiting`}
          onPress={() => navigation.getParent()?.navigate('Orders')}
          style={[styles.wide, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="clipboard-outline" size={24} color={colors.green} />
          <View style={styles.flex}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Orders for review</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{toReview ? `${toReview} waiting for your review` : 'No orders waiting'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Menu Overview</Text>
          <Pressable accessibilityRole="button" onPress={() => navigation.getParent()?.navigate('Menu')} style={styles.viewAll}>
            <Text style={{ color: colors.green, fontWeight: '600', fontSize: 13 }}>View All</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.green} />
          </Pressable>
        </View>
        <View style={styles.grid}>
          {menu.map((item) => (
            <View key={item.id} style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <OrderPhoto photo={photoKeyFor(item.name)} size={48} />
              <View style={styles.flex}>
                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }} numberOfLines={2}>{item.name}</Text>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{peso(item.price)}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const LEVEL_ICON: Record<string, IconName> = {
  sugar: 'cube-outline',
  calories: 'flame-outline',
  sodium: 'water-outline',
  protein: 'barbell-outline',
};

/** DIT-11 / DIT-12: view-only allergies and preferred nutritional levels. */
export function AllergiesPreferencesScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors } = useAdmin();
  const customers = adminView().customers;
  const counts = allergyCounts(customers);
  const levels = preferredLevels(customers);
  return (
    <View style={styles.flex}>
      <GreenHeader title="Allergies & Preferences" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <View style={styles.cardHead}>
            <Ionicons name="warning-outline" size={24} color={colors.text} />
            <View>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Allergies</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>View-only information</Text>
            </View>
          </View>
          <View style={styles.chips}>
            {[...ALLERGY_CHIPS, 'Other'].map((name) => (
              <Chip key={name} label={name} note={counts[name] ? `${counts[name]} customer${counts[name] === 1 ? '' : 's'}` : null} />
            ))}
          </View>
        </Card>
        <Card>
          <View style={styles.cardHead}>
            <Ionicons name="heart-outline" size={24} color={colors.text} />
            <View>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Preferred Nutritional Levels</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Customer&apos;s preferred range</Text>
            </View>
          </View>
          <View style={styles.levels}>
            {levels.map((tile) => (
              <View key={tile.key} style={[styles.level, { backgroundColor: colors.mint }]} accessibilityLabel={`${tile.label} ${tile.level} ${tile.range}`}>
                <Ionicons name={LEVEL_ICON[tile.key]} size={20} color={colors.green} />
                <View style={styles.flex}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{tile.label}</Text>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{tile.level}</Text>
                  {tile.range ? <Text style={{ color: colors.muted, fontSize: 11 }}>{tile.range}</Text> : null}
                  {tile.total ? <Text style={{ color: colors.muted, fontSize: 10 }}>{tile.count} of {tile.total} customers</Text> : null}
                </View>
              </View>
            ))}
          </View>
          <View style={[styles.note, { backgroundColor: colors.mint }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.green} />
            <Text style={{ color: colors.text, flex: 1, fontSize: 13 }}>These preferences help you plan suitable meal options.</Text>
          </View>
        </Card>
        <PrimaryButton title="Open customer preferences" variant="outline" onPress={() => navigation.navigate('Customers')} />
      </ScrollView>
    </View>
  );
}

/** DIT-15: the Dietitian's review card on an order waiting for review. */
export function ReviewPanel({ order }: { order: AdminOrder }) {
  const { colors, showFlash } = useAdmin();
  const actor = useActor();
  const [confirm, setConfirm] = useState(false);
  const [returning, setReturning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!actor || actor.role !== 'dietitian') return null;
  const dietary = order.dietary;
  const items = order.items ?? [];
  const decided = order.reviewDecision;
  const lines = [
    `Breakfast / lunch / dinner: ${items.length ? items.map((item) => item.name).join(', ') : 'not supplied'}`,
    `Customizations: ${order.specialInstructions?.trim() || 'not supplied'}`,
    `Allergies: ${dietary?.allergies.length ? dietary.allergies.map((item) => item.value).join(', ') : 'No known allergies recorded'}`,
    `Health conditions: ${dietary?.conditions.length ? dietary.conditions.join(', ') : 'not supplied'}`,
    `Doctor-provided restrictions: ${dietary?.restrictions.length ? dietary.restrictions.join(', ') : 'not supplied'}`,
  ];
  if (order.status !== 'For Dietitian Review') {
    if (!decided) return null;
    return (
      <Section title="Dietitian review">
        <Card>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{decided === 'approved' ? 'Approved' : 'Returned for Changes'}</Text>
          {order.reviewReason ? <Text style={{ color: colors.muted }}>Reason: {order.reviewReason}</Text> : null}
        </Card>
      </Section>
    );
  }
  const decide = async (approve: boolean, reason: string) => {
    setBusy(true);
    const result = await reviewOrderAsync(actor, order.id, approve, reason);
    setBusy(false);
    if (!result.ok) {
      if (approve) showFlash(result.message);
      else setError(result.message);
      setConfirm(false);
      return;
    }
    setConfirm(false);
    setReturning(false);
    setError(null);
    showFlash(result.message);
  };
  return (
    <Section title="Order review details">
      <Card>
        {lines.map((line) => <Text key={line} style={{ color: colors.text, fontSize: 13 }}>{line}</Text>)}
      </Card>
      <Text style={{ color: colors.muted, fontSize: 13 }}>Use verified data before recommending.</Text>
      <PrimaryButton title="Approve" disabled={busy} onPress={() => setConfirm(true)} />
      <PrimaryButton title="Return for changes" variant="outline" disabled={busy} onPress={() => { setError(null); setReturning(true); }} />
      <ConfirmCard
        visible={confirm}
        title="Approve this order?"
        body="The customer will be asked to pay. This decision is recorded."
        confirmLabel="Approve"
        cancelLabel="Cancel"
        onConfirm={() => decide(true, '')}
        onCancel={() => setConfirm(false)}
      />
      <ReasonModal
        visible={returning}
        title="Return for changes"
        body="Tell the customer what to change. They will see this reason."
        placeholder="Reason for returning"
        confirmLabel="Return order"
        error={error}
        onCancel={() => { setReturning(false); setError(null); }}
        onConfirm={(reason) => decide(false, reason)}
      />
    </Section>
  );
}

function requestedOn(row: RemovalRequest) {
  return row.requestedAt ? formatWhen(row.requestedAt) : 'not supplied';
}

/** DIT-17: pending requests oldest first, plus decided ones. */
export function RemovalRequestsScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { colors } = useAdmin();
  const actor = useActor();
  const { refreshing, onRefresh, enabled } = useRefresh();
  const [tab, setTab] = useState<'pending' | 'decided'>('pending');
  if (!actor) return null;
  const allowed = actor.role === 'dietitian';
  const rows = allowed ? removalRequests(tab) : [];
  return (
    <PhoneFrame>
      <GreenHeader title="Condition Removal Requests" onBack={() => navigation.goBack()} />
      {!allowed ? <EmptyState title={COPY.noAccess} /> : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={enabled ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}
        >
          <FlashBanner />
          <View style={styles.row}>
            {(['pending', 'decided'] as const).map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === option }}
                onPress={() => setTab(option)}
                style={[styles.segment, { backgroundColor: tab === option ? colors.header : colors.card, borderColor: colors.border }]}
              >
                <Text style={{ color: tab === option ? '#FFFFFF' : colors.text, fontWeight: '600' }}>{option === 'pending' ? 'Pending' : 'Decided'}</Text>
              </Pressable>
            ))}
          </View>
          {tab === 'pending' ? (
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {rows.length} pending · Oldest first. Requests are reviewed oldest first. Notifications do not control this list.
            </Text>
          ) : null}
          {rows.length === 0 ? <EmptyState title={tab === 'pending' ? 'No pending requests.' : 'No decided requests yet.'} /> : rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityLabel={`${row.recipientName} · ${row.condition}`}
              onPress={() => navigation.navigate('RemovalRequest', { id: row.id })}
              style={[styles.request, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.header }]}>
                <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '600' }}>{row.recipientName.slice(0, 1)}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{row.recipientName} · {row.condition}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>Date requested: {requestedOn(row)}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>Reason: {row.reason || 'not supplied'}</Text>
                {row.status !== 'pending' ? (
                  <Text style={{ color: row.status === 'approved' ? colors.green : '#D76566', fontSize: 12, fontWeight: '600' }}>
                    {row.status === 'approved' ? 'Approved' : 'Rejected'}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
          <BrandCard role="dietitian" />
        </ScrollView>
      )}
    </PhoneFrame>
  );
}

/** DIT-17 detail: recipient context, Approve, or Reject with a reason. */
export function RemovalRequestScreen({ navigation, route }: ScreenProps<{ id?: string }>) {
  useStoreRevision();
  const { colors, showFlash } = useAdmin();
  const actor = useActor();
  const id = route.params?.id ?? '';
  const [confirm, setConfirm] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const allowed = actor?.role === 'dietitian';
  useEffect(() => {
    if (allowed && id) loadRemovalRequest(id).then((result) => { if (!result.ok) showFlash(result.message); });
  }, [allowed, id, showFlash]);
  if (!actor) return null;
  const row = allowed ? removalRequest(id) : null;
  const decide = async (approve: boolean, reason: string) => {
    setBusy(true);
    const result = await decideRemovalAsync(actor, id, approve, reason);
    setBusy(false);
    if (!result.ok) {
      setConfirm(false);
      if (!approve && result.message === COPY.rejectReasonRequired) {
        setError(result.message);
        return;
      }
      setRejecting(false);
      showFlash(result.message);
      return;
    }
    setConfirm(false);
    setRejecting(false);
    showFlash(result.message);
    navigation.goBack();
  };
  const other = row?.dietary?.conditions.filter((condition) => condition !== row.condition) ?? [];
  return (
    <PhoneFrame>
      <GreenHeader title="Condition removal request" onBack={() => navigation.goBack()} />
      {!row ? <EmptyState title={allowed ? 'This request is no longer available.' : COPY.noAccess} /> : (
        <ScrollView contentContainerStyle={styles.body}>
          <FlashBanner />
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>{row.recipientName} · {row.condition}</Text>
            <Text style={{ color: colors.muted }}>Request to remove {row.condition}</Text>
          </View>
          <Card>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>Recipient details</Text>
            <Text style={{ color: colors.text, fontSize: 13 }}>Other conditions: {other.length ? other.join(', ') : 'not supplied'}</Text>
            <Text style={{ color: colors.text, fontSize: 13 }}>Reason for removal: {row.reason || 'not supplied'}</Text>
            <Text style={{ color: colors.text, fontSize: 13 }}>Requested by: {row.requestedBy || 'not supplied'}</Text>
            <Text style={{ color: colors.text, fontSize: 13 }}>Date requested: {requestedOn(row)}</Text>
          </Card>
          <Section title="Allergies & nutritional preferences">
            <Card><PreferencesPanel dietary={row.dietary} showHealth={false} /></Card>
          </Section>
          {row.status === 'pending' ? (
            <>
              <Text style={{ color: colors.muted }}>Review the request before deciding.</Text>
              <PrimaryButton title="Approve" disabled={busy} onPress={() => setConfirm(true)} />
              <PrimaryButton title="Reject" variant="danger" disabled={busy} onPress={() => { setError(null); setRejecting(true); }} />
            </>
          ) : (
            <Card>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{row.status === 'approved' ? 'Approved' : 'Rejected'}</Text>
              {row.decidedAt ? <Text style={{ color: colors.muted, fontSize: 13 }}>{formatWhen(row.decidedAt)}{row.decidedBy ? ` · ${row.decidedBy}` : ''}</Text> : null}
              {row.decisionReason ? <Text style={{ color: colors.muted, fontSize: 13 }}>Reason: {row.decisionReason}</Text> : null}
            </Card>
          )}
          <BrandCard role="dietitian" />
        </ScrollView>
      )}
      <ConfirmCard
        visible={confirm}
        title={`Remove ${row?.condition ?? 'this condition'}?`}
        body={row ? `${row.condition} will be removed from ${row.recipientName}'s health conditions and ${row.requestedBy || 'the customer'} will be notified.` : undefined}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        onConfirm={() => decide(true, '')}
        onCancel={() => setConfirm(false)}
      />
      <ReasonModal
        visible={rejecting}
        title="Reject this request?"
        body={row ? `${row.condition} stays on ${row.recipientName}'s profile. The customer will see your reason.` : undefined}
        placeholder="Reason for rejecting"
        confirmLabel="Reject"
        error={error}
        onCancel={() => { setRejecting(false); setError(null); }}
        onConfirm={(reason) => decide(false, reason)}
      />
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#DDF0E2', fontSize: 12 },
  bell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, backgroundColor: '#F2A93B', borderWidth: 1.5, borderColor: '#0E542C' },
  body: { padding: 16, gap: 14, paddingBottom: 40 },
  greeting: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, minHeight: 72, borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  wide: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  menuCard: { width: '48%', flexGrow: 1, borderRadius: 14, borderWidth: 1, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  level: { width: '47%', flexGrow: 1, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8 },
  note: { marginTop: 12, borderRadius: 14, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  segment: { flex: 1, borderRadius: 999, borderWidth: 1, paddingVertical: 9, alignItems: 'center' },
  request: { borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});
