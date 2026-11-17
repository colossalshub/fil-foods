import { useState, type ReactNode } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdmin } from '../context.js';
import { nutritionTiles, ROLE_TITLE } from '../domain/roleAccess.js';
import type { DietaryInfo, StaffRole } from '../types';
import { PrimaryButton } from '../components.js';
import { Text, TextInput } from './StaffText.js';

declare const require: (id: string) => number;

export const MEAL_PHOTOS: Record<string, number> = {
  wrap: require('../../../assets/images/meals/grilled-chicken-wrap.jpg'),
  salad: require('../../../assets/images/meals/greek-chickpea-salad.jpg'),
  salmon: require('../../../assets/images/meals/salmon-teriyaki.jpg'),
  omelette: require('../../../assets/images/meals/egg-white-omelette.jpg'),
  bangus: require('../../../assets/images/meals/grilled-bangus.jpg'),
};

export function mealPhoto(key: string | undefined) {
  return MEAL_PHOTOS[key ?? ''] ?? MEAL_PHOTOS.wrap;
}

/** Figma badge colours for every staff list and detail header. */
const BADGE_TONES: Record<string, { bg: string; fg: string }> = {
  Pending: { bg: '#FFDDBF', fg: '#8A4B12' },
  Preparing: { bg: '#D8F3DC', fg: '#146B38' },
  Delivered: { bg: '#1C773A', fg: '#FFFFFF' },
  Completed: { bg: '#1C773A', fg: '#FFFFFF' },
  Cancelled: { bg: '#D76566', fg: '#FFFFFF' },
  'Ready for Pickup': { bg: '#1C773A', fg: '#FFFFFF' },
  'Ready for Delivery': { bg: '#1C773A', fg: '#FFFFFF' },
  'Out for Delivery': { bg: '#146B38', fg: '#FFFFFF' },
  'For Dietitian Review': { bg: '#FFF1C2', fg: '#7A5A00' },
  'Awaiting Payment': { bg: '#FFDDBF', fg: '#8A4B12' },
  Paid: { bg: '#E5F6E8', fg: '#146B38' },
  Confirmed: { bg: '#E5F6E8', fg: '#146B38' },
  approved: { bg: '#D8F3DC', fg: '#146B38' },
  rejected: { bg: '#D76566', fg: '#FFFFFF' },
  pending: { bg: '#FFDDBF', fg: '#8A4B12' },
};

export function Pill({ label }: { label: string }) {
  const tone = BADGE_TONES[label] ?? { bg: '#E3E8E2', fg: '#1C2B22' };
  const text = label === 'approved' ? 'Approved' : label === 'rejected' ? 'Rejected' : label === 'pending' ? 'Pending' : label;
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={{ color: tone.fg, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (next: string) => void; placeholder: string }) {
  const { colors } = useAdmin();
  return (
    <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={placeholder}
        style={[styles.searchInput, { color: colors.text }]}
      />
      {value ? (
        <Pressable accessibilityLabel="Clear search" onPress={() => onChange('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Section({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  const { colors } = useAdmin();
  return (
    <View style={styles.section}>
      {title ? (
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  const { colors } = useAdmin();
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>;
}

export function Chip({ label, note }: { label: string; note?: string | null }) {
  const { colors } = useAdmin();
  return (
    <View style={[styles.chip, { backgroundColor: colors.mint }]}>
      <Text style={{ color: colors.green, fontWeight: '600', fontSize: 13 }}>{label}</Text>
      {note ? <Text style={{ color: colors.muted, fontSize: 11 }}>{note}</Text> : null}
    </View>
  );
}

const TILE_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  sugar: 'cube-outline',
  calories: 'flame-outline',
  sodium: 'water-outline',
  protein: 'barbell-outline',
};

export function NutritionGrid({ dietary }: { dietary: DietaryInfo | null | undefined }) {
  const { colors } = useAdmin();
  return (
    <View style={styles.grid}>
      {nutritionTiles(dietary).map((tile) => (
        <View key={tile.key} style={[styles.tile, { backgroundColor: colors.mint }]} accessibilityLabel={`${tile.label} ${tile.level} ${tile.range}`}>
          <Ionicons name={TILE_ICON[tile.key]} size={20} color={colors.green} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>{tile.label}</Text>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{tile.level}</Text>
          {tile.range ? <Text style={{ color: colors.muted, fontSize: 11 }}>{tile.range}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Allergies, conditions, restrictions and nutrition levels; `compact` drops health conditions. */
export function PreferencesPanel({ dietary, showHealth = true }: { dietary: DietaryInfo | null | undefined; showHealth?: boolean }) {
  const { colors } = useAdmin();
  const allergies = dietary?.allergies ?? [];
  return (
    <View style={{ gap: 12 }}>
      <View>
        <Text style={[styles.label, { color: colors.muted }]}>Allergies</Text>
        <View style={styles.chips}>
          {allergies.length ? allergies.map((item) => <Chip key={item.value} label={item.value} note={item.note} />)
            : <Text style={{ color: colors.text }}>No listed allergens</Text>}
        </View>
      </View>
      {showHealth ? (
        <View>
          <Text style={[styles.label, { color: colors.muted }]}>Health conditions</Text>
          <Text style={{ color: colors.text }}>{dietary?.conditions.length ? dietary.conditions.join(', ') : 'Not supplied'}</Text>
        </View>
      ) : null}
      <View>
        <Text style={[styles.label, { color: colors.muted }]}>Dietary preferences</Text>
        <Text style={{ color: colors.text }}>{dietary?.restrictions.length ? dietary.restrictions.join(', ') : 'Not provided'}</Text>
      </View>
      <View>
        <Text style={[styles.label, { color: colors.muted }]}>Preferred Nutritional Levels</Text>
        <NutritionGrid dietary={dietary} />
      </View>
    </View>
  );
}

export function BrandCard({ role }: { role: StaffRole }) {
  const { colors } = useAdmin();
  return (
    <View style={[styles.brand, { backgroundColor: colors.mint }]}>
      <Ionicons name="restaurant" size={28} color={colors.greenDeep} />
      <Text style={{ color: colors.greenDeep, fontSize: 20, fontWeight: '700' }}>F.I.L Foods</Text>
      <Text style={{ color: colors.greenDeep, fontSize: 12 }}>{role === 'admin' ? 'Admin Panel' : ROLE_TITLE[role]}</Text>
    </View>
  );
}

/** Text-entry confirm used for "Return for changes" and "Reject" (reason required). */
export function ReasonModal({
  visible,
  title,
  body,
  confirmLabel,
  placeholder,
  error,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  placeholder: string;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { colors } = useAdmin();
  const [reason, setReason] = useState('');
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{title}</Text>
          {body ? <Text style={{ color: colors.muted }}>{body}</Text> : null}
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            multiline
            accessibilityLabel={placeholder}
            style={[styles.reason, { color: colors.text, borderColor: error ? '#D64545' : colors.border }]}
          />
          {error ? <Text style={{ color: '#D64545', fontSize: 13 }}>{error}</Text> : null}
          <PrimaryButton title={confirmLabel} variant="danger" onPress={() => onConfirm(reason)} />
          <Pressable onPress={() => { setReason(''); onCancel(); }} style={styles.cancel}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  const { colors } = useAdmin();
  return (
    <View style={styles.empty}>
      <Ionicons name="file-tray-outline" size={36} color={colors.muted} />
      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16, textAlign: 'center' }}>{title}</Text>
      {action}
    </View>
  );
}

export function OrderPhoto({ photo, size = 58 }: { photo?: string; size?: number }) {
  return <Image source={mealPhoto(photo)} style={{ width: size, height: size, borderRadius: 12 }} />;
}

const styles = StyleSheet.create({
  pill: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, minHeight: 26, justifyContent: 'center', alignSelf: 'flex-start' },
  search: { marginHorizontal: 16, marginTop: 16, marginBottom: 8, borderWidth: 1, borderRadius: 14, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  // outlineWidth: 0 removes the browser focus box on web; native ignores it.
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10, outlineWidth: 0 } as object,
  section: { gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 14, padding: 12, gap: 2 },
  label: { fontSize: 13, marginBottom: 6 },
  brand: { borderRadius: 18, alignItems: 'center', paddingVertical: 18, gap: 2, marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(16, 22, 18, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 20, gap: 12 },
  reason: { borderWidth: 1, borderRadius: 12, minHeight: 96, padding: 12, textAlignVertical: 'top', fontSize: 15 , outlineWidth: 0 } as object,
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 12, padding: 32 },
});
