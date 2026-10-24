import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '../theme/theme';

export default function Checkbox({ checked, onToggle, children, color, accessibilityLabel }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
      style={styles.row}
      onPress={onToggle}
    >
      <View style={[styles.box, color && { borderColor: color }, checked && [styles.boxOn, color && { backgroundColor: color, borderColor: color }]]}>
        {checked ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
      </View>
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, minHeight: 48 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: colors.white },
  boxOn: { backgroundColor: colors.action },
  label: { flex: 1, fontSize: font.body, color: colors.text, lineHeight: 22 },
});
