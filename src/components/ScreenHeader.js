import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HelpModal } from './LegalModals';
import { colors, font, spacing } from '../theme/theme';

export default function ScreenHeader({ title, subtitle }) {
  const [help, setHelp] = useState(false);
  return (
    <View style={styles.wrap}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <Pressable onPress={() => setHelp(true)} hitSlop={8}>
        <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
      </Pressable>
      <HelpModal visible={help} onClose={() => setHelp(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.primary },
  sub: { fontSize: font.sm, color: colors.muted },
});
