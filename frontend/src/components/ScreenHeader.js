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
        <Ionicons name="help-circle-outline" size={26} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.primary, borderBottomWidth: 1, borderBottomColor: colors.primaryDark },
  titles: { flex: 1, paddingRight: spacing.sm },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.white },
  sub: { fontSize: font.sm, color: '#E3F2DE' },
  helpHit: { minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center' },
});
