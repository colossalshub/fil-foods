import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AuthLayout from '../../components/AuthLayout';
import AppButton from '../../components/AppButton';
import { USER_STORIES } from '../../data/userStories';
import { resetDemoData } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { colors, font, radius, spacing } from '../../theme/theme';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'done', label: 'Done' },
  { id: 'mocked', label: 'Mocked' },
  { id: 'not_started', label: 'Not started' },
];

const STATUS_LABEL = { done: 'Done', mocked: 'Mocked', not_started: 'Not started' };

export default function RequirementsScreen({ navigation }) {
  const { signOut } = useAuth();
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState('CLT-01');
  const stories = useMemo(
    () => USER_STORIES.filter((story) => filter === 'all' || story.status === filter),
    [filter],
  );

  const onReset = () => {
    resetDemoData();
    signOut();
  };

  return (
    <AuthLayout variant="back" title="Requirements" onBack={() => navigation.goBack()}>
      <Text style={styles.lead}>
        Client stories CLT-01 to CLT-46. Phase 1 is authentication. Status is what this build can demo.
      </Text>
      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={item.label}
              onPress={() => setFilter(item.id)}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {stories.map((story) => {
        const open = openId === story.id;
        return (
          <Pressable
            key={story.id}
            accessibilityRole="button"
            accessibilityLabel={`${story.id} ${story.title}, ${STATUS_LABEL[story.status]}`}
            onPress={() => setOpenId(open ? null : story.id)}
            style={styles.card}
          >
            <View style={styles.cardTop}>
              <Text style={styles.id}>{story.id}</Text>
              <Text style={[styles.badge, styles[story.status]]}>{STATUS_LABEL[story.status]}</Text>
            </View>
            <Text style={styles.title}>{story.title}</Text>
            <Text style={styles.phase}>{story.phase}</Text>
            {open ? (
              <View>
                {story.note ? <Text style={styles.note}>{story.note}</Text> : null}
                {story.criteria.map((line) => (
                  <Text key={line} style={styles.criteria}>{`• ${line}`}</Text>
                ))}
              </View>
            ) : null}
          </Pressable>
        );
      })}
      <AppButton title="Reset sample accounts" variant="outline" onPress={onReset} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: font.md, color: colors.text, lineHeight: 22, marginBottom: spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontSize: font.md, color: colors.primary, fontWeight: '700' },
  chipTextOn: { color: colors.white },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  id: { fontSize: font.md, fontWeight: '700', color: colors.deep },
  title: { fontSize: font.md, color: colors.text, marginTop: 4 },
  phase: { fontSize: font.sm, color: colors.muted, marginTop: 2, marginBottom: 4 },
  badge: { fontSize: font.sm, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  done: { backgroundColor: colors.tint, color: colors.primary },
  mocked: { backgroundColor: '#FFF6D8', color: '#8A5A00' },
  not_started: { backgroundColor: colors.background, color: colors.muted },
  note: { fontSize: font.md, color: colors.text, lineHeight: 22, marginTop: spacing.sm },
  criteria: { fontSize: font.md, color: colors.text, lineHeight: 22, marginTop: 6 },
});
