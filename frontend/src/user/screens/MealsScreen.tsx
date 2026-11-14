import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../components/AppPageShell';
import {
  MENU_SLOT_SUBTITLE,
  menuSectionsForSlot,
  resolveMenuMeal,
  type MenuCatalogItem,
  type MenuSlot,
} from '../data/menuCatalog';
import { formatPeso } from '../services/orderService';
import { colors, font, radius, spacing, control } from '../theme/theme';

const MENU_SLOTS: MenuSlot[] = ['Breakfast', 'Lunch', 'Dinner'];

function MenuRow({ item, showPrice, onPress }: {
  item: MenuCatalogItem;
  showPrice: boolean;
  onPress: () => void;
}) {
  const available = item.available;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${available ? ', available' : ', not available'}`}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowName}>{item.name}</Text>
        {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, available ? styles.statusDotOn : styles.statusDotOff]} />
          <Text style={[styles.statusLabel, available ? styles.statusOn : styles.statusOff]}>
            {available ? 'Available' : 'Not available'}
          </Text>
        </View>
      </View>
      {showPrice && item.price != null ? (
        <Text style={styles.rowPrice}>{formatPeso(item.price)}</Text>
      ) : null}
    </Pressable>
  );
}

export default function MealsScreen({ navigation }: {
  navigation: {
    navigate: (name: string, params?: object) => void;
    goBack: () => void;
  };
}) {
  const [slot, setSlot] = useState<MenuSlot>('Breakfast');
  const sections = useMemo(() => menuSectionsForSlot(slot), [slot]);
  const showPrice = slot === 'Breakfast';

  const openItem = (item: MenuCatalogItem) => {
    navigation.navigate('MealDetail', {
      meal: resolveMenuMeal(item),
      initials: item.initials,
    });
  };

  return (
    <AppPageShell edges={['top']} contentStyle={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to today's meals"
          onPress={() => navigation.goBack()}
          style={styles.backRow}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backLabel}>{`Today's meals`}</Text>
        </Pressable>

        <Text style={styles.title} accessibilityRole="header">Menu</Text>
        <Text style={styles.subtitle}>{MENU_SLOT_SUBTITLE[slot]}</Text>

        <View style={styles.slots}>
          {MENU_SLOTS.map((item) => {
            const active = item === slot;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setSlot(item)}
                style={[styles.slot, active ? styles.slotOn : styles.slotOff]}
              >
                <Text style={[styles.slotLabel, active && styles.slotLabelOn]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <View key={item.id}>
                  <MenuRow item={item} showPrice={showPrice} onPress={() => openItem(item)} />
                  {index < section.items.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: control.minHeight,
    marginBottom: spacing.sm,
  },
  backLabel: { fontSize: font.body, fontWeight: '700', color: colors.primary },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#1C3B2E' },
  subtitle: { marginTop: spacing.xs, fontSize: font.body, lineHeight: 22, color: '#5C675F' },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.md },
  slot: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotOn: { backgroundColor: '#1E4D38' },
  slotOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#D6DDD5' },
  slotLabel: { fontSize: font.body, fontWeight: '700', color: '#24312A' },
  slotLabelOn: { color: colors.white },
  sectionBlock: { marginTop: spacing.lg },
  sectionTitle: {
    fontSize: font.sm,
    letterSpacing: 1.2,
    fontWeight: '800',
    color: '#8A948C',
    marginBottom: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#E4EAE2',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: control.minHeight,
  },
  rowMain: { flex: 1 },
  rowName: { fontSize: font.body, lineHeight: 22, fontWeight: '800', color: '#1C3B2E' },
  rowSubtitle: { marginTop: 2, fontSize: font.body, lineHeight: 20, color: '#66706A' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusDotOn: { backgroundColor: '#1E7A45' },
  statusDotOff: { backgroundColor: '#B0B8B2' },
  statusLabel: { fontSize: font.body, fontWeight: '700' },
  statusOn: { color: '#1E7A45' },
  statusOff: { color: '#8A948C' },
  rowPrice: { fontSize: font.body, lineHeight: 22, fontWeight: '800', color: '#1C3B2E' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8EDE6', marginHorizontal: spacing.lg },
});