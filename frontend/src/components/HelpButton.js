import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { openHelp } from '../navigation/openHelp';
import { colors } from '../theme/theme';

export default function HelpButton({ color = colors.primary }) {
  const navigation = useNavigation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Help"
      onPress={() => openHelp(navigation)}
      style={styles.hit}
    >
      <Ionicons name="help-circle-outline" size={26} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
