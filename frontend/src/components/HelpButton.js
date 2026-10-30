import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { openHelp } from '../navigation/openHelp';
import { colors, font } from '../theme/theme';

export default function HelpButton({ color = colors.primary }) {
  const navigation = useNavigation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Help"
      onPress={() => openHelp(navigation)}
      style={styles.hit}
    >
      <Ionicons name="help-circle-outline" size={22} color={color} />
      <Text style={[styles.label, { color }]} allowFontScaling>Help</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  label: { fontSize: font.body, fontWeight: '700', lineHeight: 22 },
});
