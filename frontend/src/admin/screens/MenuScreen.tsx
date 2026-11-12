import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COPY } from '../copy.js';
import {
  CATEGORIES,
  adminView,
  deleteMenu,
  menuChanges,
  saveMenu,
  setMenuAvailability,
} from '../data/store.js';
import { peso } from '../domain/format.js';
import { useAdmin } from '../context.js';
import { tabBarStyle, type ScreenProps } from '../nav.js';
import type { MenuDraft } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AdminField,
  ConfirmCard,
  FlashBanner,
  GreenHeader,
  PrimaryButton,
  useStoreRevision,
} from '../components.js';

export function MenuScreen({ navigation }: ScreenProps) {
  useStoreRevision();
  const { session, colors, showFlash, t } = useAdmin();
  const data = adminView();
  const actor = session ? { id: session.id, name: session.name, email: session.email, role: session.role } : null;
  return (
    <View style={styles.flex}>
      <GreenHeader title={t('menu')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
        <FlashBanner />
        <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.planTitle, { color: colors.text }]}>Plans</Text>
          {data.plans.map((plan) => (
            <Text key={plan.id} style={{ color: colors.text, marginTop: 4 }}>{plan.name} {peso(plan.price)}</Text>
          ))}
          <Text style={{ color: colors.muted, marginTop: 8 }}>Only available items can be ordered.</Text>
        </View>
        {CATEGORIES.map((category) => {
          const items = data.menu.filter((item) => item.category === category);
          if (!items.length) return null;
          return (
            <View key={category}>
              <Text style={[styles.category, { color: colors.green }]}>{category}</Text>
              {items.map((item) => (
                <View key={item.id} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.flex}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      {item.ingredients.join(', ') || 'No ingredients listed'}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      Allergens: {item.allergens.join(', ') || 'None'}
                    </Text>
                    {!item.available ? <Text style={styles.warn}>{COPY.notSelectable}</Text> : null}
                  </View>
                  <View style={styles.side}>
                    <Text style={[styles.price, { color: colors.text }]}>{peso(item.price)}</Text>
                    <Switch
                      value={item.available}
                      onValueChange={(available) => {
                        if (!actor) return;
                        const result = setMenuAvailability(actor, item.id, available);
                        if (result.message) showFlash(result.message);
                      }}
                      trackColor={{ true: colors.green, false: colors.border }}
                    />
                    <Pressable accessibilityLabel={`Edit ${item.name}`} onPress={() => navigation.navigate('MenuForm', { id: item.id })}>
                      <Ionicons name="create-outline" size={20} color={colors.green} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          );
        })}
        <PrimaryButton title={t('addItem')} onPress={() => navigation.navigate('MenuForm')} />
      </ScrollView>
    </View>
  );
}

const emptyDraft = (category = CATEGORIES[0]): MenuDraft => ({
  name: '',
  category,
  price: '',
  available: true,
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

  const save = () => {
    if (!actor) return;
    const result = saveMenu(actor, existing?.id ?? null, draft);
    if (!result.ok) {
      setError(result.message);
      setConfirm(false);
      return;
    }
    showFlash(existing ? 'Menu item updated' : 'Menu item added');
    navigation.goBack();
  };

  return (
    <View style={styles.flex}>
      <GreenHeader title={existing ? 'Edit item' : 'Add item'} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
        <AdminField icon="restaurant-outline" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Name" />
        <Text style={{ color: colors.muted, fontWeight: '700' }}>Category</Text>
        <View style={styles.cats}>
          {CATEGORIES.map((category) => (
            <Pressable key={category} onPress={() => setDraft({ ...draft, category })} style={[styles.cat, { borderColor: draft.category === category ? colors.primary : colors.border, backgroundColor: draft.category === category ? colors.mint : colors.card }]}>
              <Text style={{ color: colors.text, fontSize: 12 }}>{category}</Text>
            </Pressable>
          ))}
        </View>
        <AdminField icon="cash-outline" value={draft.price} onChangeText={(price) => setDraft({ ...draft, price })} placeholder="Price" keyboardType="decimal-pad" error={error} />
        <AdminField value={draft.ingredients} onChangeText={(ingredients) => setDraft({ ...draft, ingredients })} placeholder="Ingredients, separated by commas" />
        <AdminField value={draft.allergens} onChangeText={(allergens) => setDraft({ ...draft, allergens })} placeholder="Allergens, separated by commas" />
        <View style={styles.switchRow}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Available</Text>
          <Switch value={draft.available} onValueChange={(available) => setDraft({ ...draft, available })} trackColor={{ true: colors.green, false: colors.border }} />
        </View>
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
        title={existing?.name ?? 'Save changes'}
        body={changes.map((change) => `${change.label}: ${change.from} → ${change.to}`).join('\n')}
        confirmLabel={COPY.saveChanges}
        cancelLabel={COPY.keepEditing}
        onConfirm={save}
        onCancel={() => setConfirm(false)}
      />
      <ConfirmCard
        visible={remove}
        title="Delete this item?"
        body={COPY.menuDeleted}
        confirmLabel={COPY.yesDelete}
        cancelLabel="Keep item"
        danger
        onConfirm={() => {
          if (!actor || !existing) return;
          const result = deleteMenu(actor, existing.id);
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
  item: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', gap: 8 },
  name: { fontWeight: '800', marginBottom: 4 },
  price: { fontWeight: '800' },
  side: { alignItems: 'flex-end', gap: 8 },
  warn: { color: '#D76566', marginTop: 4, fontSize: 13 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
});
