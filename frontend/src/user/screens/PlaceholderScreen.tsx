import type { ReactNode } from 'react';
import type { ComponentProps } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppPageShell from '../components/AppPageShell';
import { colors, card, font, spacing } from '../theme/theme';

export default function PlaceholderScreen({ title, icon, message, children }: {
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  message?: string;
  children?: ReactNode;
}) {
  return (
    <AppPageShell edges={['top']} contentStyle={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.title} accessibilityRole="header">{title}</Text>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={34} color={colors.primary} />
          </View>
          <Text style={styles.msg}>{message}</Text>
          {children}
        </View>
      </View>
    </AppPageShell>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.md, justifyContent: 'flex-start' },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: '#1C3B2E', marginBottom: spacing.xl },
  card: { ...card, alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E9F0E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msg: { fontSize: font.body, lineHeight: 24, color: colors.muted, textAlign: 'center' },
});
