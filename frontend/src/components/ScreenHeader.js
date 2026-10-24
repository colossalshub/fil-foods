import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { openHelp } from '../navigation/openHelp';
import { colors, font, spacing, touch } from '../theme/theme';

export default function ScreenHeader({ title, subtitle }) {
  const navigation = useNavigation();
  return (
    <View style={styles.wrap}>
      <View style={styles.titles}>
        <Text style={styles.title} allowFontScaling>{title}</Text>
        {subtitle ? <Text style={styles.sub} allowFontScaling>{subtitle}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Help"
        onPress={() => openHelp(navigation)}
        style={styles.helpHit}
      >
        <Ionicons name="help-circle-outline" size={26} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  titles: { flex: 1, paddingRight: spacing.sm },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.primary },
  sub: { fontSize: font.sm, color: colors.muted },
  helpHit: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
});
