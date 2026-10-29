import { View, Text, StyleSheet } from 'react-native';
import InfoModal from './InfoModal';
import AppButton from './AppButton';
import Chip from './Chip';
import { FILTER_CATEGORIES, FILTER_RESTRICTIONS, ALLERGENS } from '../data/meals';
import { colors, font } from '../theme/theme';

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function FilterModal({ visible, filters, onChange, onClose }) {
  const reset = () => onChange({ category: null, diets: [], allergens: [] });
  return (
    <InfoModal
      visible={visible} title="Filters" onClose={onClose}
      footer={<View><AppButton title="Apply" onPress={onClose} /><AppButton title="Reset" variant="outline" onPress={reset} style={{ marginTop: 8 }} /></View>}
    >
      <Text style={styles.h}>Category</Text>
      <View style={styles.row}>
        {FILTER_CATEGORIES.map((c) => (
          <Chip key={c} label={c} active={filters.category === c}
            onPress={() => onChange({ ...filters, category: filters.category === c ? null : c })} />
        ))}
      </View>
      <Text style={styles.h}>Dietary restriction</Text>
      <View style={styles.row}>
        {FILTER_RESTRICTIONS.map((d) => (
          <Chip key={d} label={d} active={filters.diets.includes(d)}
            onPress={() => onChange({ ...filters, diets: toggle(filters.diets, d) })} />
        ))}
      </View>
      <Text style={styles.h}>Allergen-free</Text>
      <View style={styles.row}>
        {ALLERGENS.map((a) => (
          <Chip key={a} label={a} active={filters.allergens.includes(a)}
            onPress={() => onChange({ ...filters, allergens: toggle(filters.allergens, a) })} />
        ))}
      </View>
    </InfoModal>
  );
}

const styles = StyleSheet.create({
  h: { fontSize: font.body, fontWeight: '700', color: colors.primary, marginBottom: 6, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
});
