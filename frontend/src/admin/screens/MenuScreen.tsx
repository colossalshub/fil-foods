import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Text } from '../ui/StaffText.js';
import { Ionicons } from '@expo/vector-icons';
import { COPY } from '../copy.js';
import {
  MEAL_TIMES,
  adminView,
  mealTimeOf,
  menuCategories,
  deleteMenuAsync,
  menuChanges,
  saveMenuAsync,
  setMenuAvailabilityAsync,
} from '../data/store.js';
import { peso } from '../domain/format.js';
import { useAdmin } from '../context.js';
import { tabBarStyle, type ScreenProps } from '../nav.js';
import type { MenuDraft, MenuItem } from '../types';
import { can } from '../domain/roleAccess.js';
import { photoKeyFor } from '../../lib/staffBackend.js';
import { EmptyState, OrderPhoto } from '../ui/blocks.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AdminField,
  ConfirmCard,
  FlashBanner,
  GreenHeader,
  PrimaryButton,
  useStoreRevision,
} from '../components.js';

type MealTab = 'All' | typeof MEAL_TIMES[number];

/** ADM-17/18 (Admin edits details, views availability), DIT-14 (view only), KIT-15 (Kitchen sets
 * availability only). Delivery has no Menu tab (DEL-14 removed in the revised workbook). */
export function MenuScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { session, colors, showFlash, t } = useAdmin();
  const [tab, setTab] = useState<MealTab>('All');
  const [preview, setPreview] = useState<MenuItem | null>(null);
  const data = adminView();
  const actor = session ? { id: session.id, name: session.name, email: session.email, role: session.role } : null;
  if (!actor) return null;
  const manage = can(actor.role, 'menuManage');
  const toggle = can(actor.role, 'menuAvailability');
  const categories = menuCategories();
  const items = data.menu.filter((item) => tab === 'All' || mealTimeOf(item.category) === tab);
  const groups = categories
    .map((category) => ({ category, rows: items.filter((item) => item.category === category) }))
    .filter((group) => group.rows.length);
  return (
    <View style={styles.flex}>
      <GreenHeader
        title={t('menu')}
        onBack={() => navigation.getParent()?.navigate('Dashboard')}
        right={manage ? (
          <Pressable accessibilityLabel="Add menu item" onPress={() => navigation.navigate('MenuForm')}>
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </Pressable>
        ) : undefined}
      />
      <View style={styles.tabs}>
        {(['All', ...MEAL_TIMES] as MealTab[]).map((option) => {
          const selected = option === tab;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setTab(option)}
              style={[styles.tab, { backgroundColor: selected ? colors.header : colors.card, borderColor: selected ? colors.header : colors.border }]}
            >
              <Text style={{ color: selected ? '#FFFFFF' : colors.text, fontWeight: '600', fontSize: 13 }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 28 }}>
        <FlashBanner />
        {actor.role === 'admin' && tab === 'All' ? (
          <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.planTitle, { color: colors.text }]}>Plans</Text>
            {data.plans.map((plan) => (
              <Text key={plan.id} style={{ color: colors.text, marginTop: 4 }}>{plan.name} {peso(plan.price)}</Text>
            ))}
            <Text style={{ color: colors.muted, marginTop: 8 }}>Only available items can be ordered. {COPY.availabilityByKitchen}</Text>
          </View>
        ) : null}
        {groups.length === 0 ? <EmptyState title="No menu items yet." /> : groups.map((group) => (
          <View key={group.category}>
            <Text style={[styles.category, { color: colors.green }]}>{group.category}</Text>
            {group.rows.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                onPress={() => (manage ? navigation.navigate('MenuForm', { id: item.id }) : setPreview(item))}
                style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <OrderPhoto photo={photoKeyFor(item.name)} size={52} />
                <View style={styles.flex}>
                  <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.price, { color: colors.text }]}>{peso(item.price)}</Text>
                  {manage || toggle ? (
                    <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                      {item.allergens.length ? `Allergens: ${item.allergens.join(', ')}` : 'Allergens: None'}
                    </Text>
                  ) : null}
                  {!item.available ? <Text style={styles.warn}>{COPY.notSelectable}</Text> : null}
                  {manage && item.available ? <Text style={{ color: colors.green, fontSize: 12 }}>Available</Text> : null}
                </View>
                {toggle ? (
                  <Switch
                    accessibilityLabel={`${item.name} available`}
                    value={item.available}
                    onValueChange={async (available) => {
                      const result = await setMenuAvailabilityAsync(actor, item.id, available);
                      if (result.message) showFlash(result.message);
                    }}
                    trackColor={{ true: colors.green, false: colors.border }}
                  />
                ) : manage ? (
                  <View style={[styles.editPill, { backgroundColor: colors.header }]}>
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Edit</Text>
                  </View>
                ) : <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
      <ConfirmCard
        visible={!!preview}
        title={preview ? `${preview.name} · ${peso(preview.price)}` : ''}
        body={preview ? [
          `Nutrition: not supplied`,
          `Allergens: ${preview.allergens.length ? preview.allergens.join(', ') : 'not supplied'}`,
          `Ingredients: ${preview.ingredients.length ? preview.ingredients.join(', ') : 'not supplied'}`,
          preview.available ? 'Available for new orders.' : COPY.notSelectable,
          'Use verified data before recommending.',
        ].join('\n') : undefined}
        confirmLabel="Close"
        onConfirm={() => setPreview(null)}
      />
    </View>
  );
}

const emptyDraft = (category = menuCategories()[0]): MenuDraft => ({
  name: '',
  category,
  price: '',
  // KIT-15 / ADM-18: Kitchen Staff decide availability, so a new item starts unavailable.
  available: false,
  ingredients: '',
  allergens: '',
});

export function MenuFormScreen({ navigation, route }: ScreenProps<{ id?: string }>) {
  useStoreRevision();
  const insets = useSafeAreaInsets();
  const { session, colors, showFlash } = useAdmin();
  const existing = adminView().menu.find((item) => item.id === route.params?.id);
  const [draft, setDraft] = useState<MenuDraft>(() => existing ? {
    name: existing.name,
    category: existing.category,
    price: existing.price.toFixed(2),
    available: existing.available,
    ingredients: existing.ingredients.join(', '),
    allergens: existing.allergens.join(', '),
  } : emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [remove, setRemove] = useState(false);
  const actor = session ? { id: session.id, name: session.name, email: session.email, role: session.role } : null;
  const changes = existing && actor ? menuChanges(existing.id, draft) : [];

  useEffect(() => {
    const tabs = navigation.getParent();
    tabs?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => {
      tabs?.setOptions({ tabBarStyle: tabBarStyle(insets, colors) });
    };
  }, [navigation, insets, colors]);

  const save = async () => {
    if (!actor) return;
    const result = await saveMenuAsync(actor, existing?.id ?? null, draft);
    if (!result.ok) {
      setError(result.message);
      setConfirm(false);
      return;
    }
    const updated = `${COPY.menuUpdated}. ${draft.name.trim()} is now ${peso(Number(draft.price) || 0)}.`;
    showFlash(existing ? updated : COPY.menuAdded);
    navigation.goBack();
  };

  if (!actor || !can(actor.role, 'menuManage')) {
    return (
      <View style={styles.flex}>
        <GreenHeader title="Menu" onBack={() => navigation.goBack()} />
        <EmptyState title={COPY.notAuthorized} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <GreenHeader title={existing ? 'Edit Menu Item' : 'Add Menu Item'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
        <AdminField icon="restaurant-outline" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Item name" />
        <Text style={{ color: colors.muted, fontWeight: '700' }}>Category</Text>
        <View style={styles.cats}>
          {menuCategories().map((category) => (
            <Pressable key={category} onPress={() => setDraft({ ...draft, category })} style={[styles.cat, { borderColor: draft.category === category ? colors.primary : colors.border, backgroundColor: draft.category === category ? colors.mint : colors.card }]}>
              <Text style={{ color: colors.text, fontSize: 12 }}>{category}</Text>
            </Pressable>
          ))}
        </View>
        <AdminField icon="cash-outline" value={draft.price} onChangeText={(price) => setDraft({ ...draft, price })} placeholder="Price" keyboardType="decimal-pad" error={error} />
        <AdminField value={draft.ingredients} onChangeText={(ingredients) => setDraft({ ...draft, ingredients })} placeholder="Ingredients, separated by commas" />
        <AdminField value={draft.allergens} onChangeText={(allergens) => setDraft({ ...draft, allergens })} placeholder="Allergens, separated by commas" />
        <View style={styles.switchRow}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Availability</Text>
          <Text style={{ color: draft.available ? colors.green : '#D76566' }}>{draft.available ? 'Available' : 'Unavailable'}</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{COPY.availabilityByKitchen}</Text>
        <PrimaryButton
          title={existing ? COPY.saveChanges : 'Add item'}
          onPress={() => {
            if (existing) {
              if (!changes.length) {
                setError(COPY.nothingChanged);
                return;
              }
              setConfirm(true);
              return;
            }
            save();
          }}
        />
        {existing ? <PrimaryButton title="Delete item" variant="danger" onPress={() => setRemove(true)} /> : null}
      </ScrollView>
      <ConfirmCard
        visible={confirm}
        title="Save menu changes?"
        body={[
          `Save your changes to ${existing?.name ?? 'this item'}? The updated price will appear on the menu.`,
          ...changes.map((change) => `${existing?.name ?? ''} ${change.label}: ${change.from} → ${change.to}`),
        ].join('\n')}
        confirmLabel={COPY.saveChanges}
        cancelLabel={COPY.keepEditing}
        onConfirm={save}
        onCancel={() => setConfirm(false)}
      />
      <ConfirmCard
        visible={remove}
        title={`Delete ${existing?.name ?? 'this item'}?`}
        body={`Are you sure you want to delete ${existing?.name ?? 'this item'} from the menu? This action cannot be undone.\n${COPY.menuDeleteWarning}`}
        confirmLabel={COPY.yesDelete}
        cancelLabel="No, keep it"
        danger
        onConfirm={async () => {
          if (!actor || !existing) return;
          const result = await deleteMenuAsync(actor, existing.id);
          showFlash(result.message);
          navigation.goBack();
        }}
        onCancel={() => setRemove(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  planCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 8 },
  planTitle: { fontWeight: '800', fontSize: 16 },
  category: { fontWeight: '800', marginTop: 14, marginBottom: 8 },
  item: { borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontWeight: '600' },
  price: { fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  tab: { flex: 1, borderRadius: 999, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
  editPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  warn: { color: '#D76566', marginTop: 4, fontSize: 13 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
});
