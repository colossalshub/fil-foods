import { useMemo, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  FAQ_GROUPS,
  FAQ_NO_MATCH,
  searchFaq,
} from '../data/helpContent';
import { FAQ_COPY } from '../data/messages';
import { colors, card, font, radius, spacing, touch } from '../theme/theme';

const MIN_SEARCH_CHARS = 2;

function FaqBlock({ group, expandedId, onToggle }: {
  group: { title: string; items: { id: string; question: string; answer: string }[] };
  expandedId: string | null;
  onToggle: (id: string | null) => void;
}) {
  return (
    <View style={styles.faqGroup}>
      <Text style={styles.groupTitle} allowFontScaling accessibilityRole="header">
        {group.title}
      </Text>
      {group.items.map((item) => {
        const open = expandedId === item.id;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.question}
            accessibilityState={{ expanded: open }}
            onPress={() => onToggle(open ? null : item.id)}
            style={[styles.faqItem, open && styles.faqItemOpen]}
          >
            <View style={styles.faqQuestionRow}>
              <Text style={styles.faqQuestion} allowFontScaling>{item.question}</Text>
              <Ionicons
                name={open ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.primary}
              />
            </View>
            {open ? (
              <>
                <Text style={styles.faqAnswer} allowFontScaling>{item.answer}</Text>
                <Text style={styles.collapseHint} allowFontScaling>{FAQ_COPY.tapToCollapse}</Text>
              </>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function FaqExperience({
  contentContainerStyle,
}: {
  contentContainerStyle?: object;
}) {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const trimmed = query.trim();
  const queryLen = trimmed.length;
  const searching = queryLen >= MIN_SEARCH_CHARS;

  const results = useMemo(() => searchFaq(query), [query]);

  const filteredGroups = useMemo(() => {
    if (!searching) return FAQ_GROUPS;
    const ids = new Set(results.map((r) => r.id));
    return FAQ_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => ids.has(item.id)),
    })).filter((group) => group.items.length > 0);
  }, [results, searching]);

  const showMinCharsHint = queryLen > 0 && queryLen < MIN_SEARCH_CHARS;
  const showNoResults = searching && results.length === 0;

  return (
    <View style={[styles.root, contentContainerStyle]}>
      <Text style={styles.subtitle} allowFontScaling>{FAQ_COPY.subtitle}</Text>

      <View style={styles.searchField}>
        <Ionicons name="search" size={22} color={colors.deep} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            setExpandedId(null);
          }}
          placeholder={FAQ_COPY.searchPlaceholder}
          placeholderTextColor={colors.inactive}
          accessibilityLabel={FAQ_COPY.searchPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={FAQ_COPY.clearSearch}
            onPress={() => {
              setQuery('');
              setExpandedId(null);
            }}
            style={styles.clearHit}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={22} color={colors.inactive} />
          </Pressable>
        ) : null}
      </View>

      {showMinCharsHint ? (
        <Text style={styles.searchHint} allowFontScaling accessibilityLiveRegion="polite">
          {FAQ_COPY.searchMinChars(MIN_SEARCH_CHARS)}
        </Text>
      ) : null}

      {showNoResults ? (
        <View style={styles.emptyState} accessibilityRole="text" accessibilityLiveRegion="polite">
          <Ionicons name="search-outline" size={48} color={colors.muted} />
          <Text style={styles.noMatch} allowFontScaling>{FAQ_NO_MATCH}</Text>
        </View>
      ) : (
        filteredGroups.map((group) => (
          <FaqBlock
            key={group.id}
            group={group}
            expandedId={expandedId}
            onToggle={setExpandedId}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1 },
  subtitle: {
    marginBottom: spacing.lg,
    fontSize: font.body,
    lineHeight: 24,
    color: '#6B9B7A',
    fontWeight: '500',
  },
  searchField: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    minHeight: touch.min,
    marginBottom: spacing.sm,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: font.body,
    color: colors.text,
    paddingVertical: 12,
  },
  clearHit: {
    minWidth: touch.min,
    minHeight: touch.min,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
  searchHint: {
    fontSize: font.body,
    lineHeight: 22,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    gap: spacing.md,
  },
  noMatch: {
    fontSize: font.body,
    lineHeight: 24,
    color: colors.muted,
    textAlign: 'center',
  },
  faqGroup: { marginBottom: spacing.lg },
  groupTitle: {
    fontSize: font.lg,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  faqItem: {
    ...card,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  faqItemOpen: {
    backgroundColor: colors.mint,
    borderColor: colors.mintBorder,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '600',
  },
  faqAnswer: {
    marginTop: spacing.sm,
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
  },
  collapseHint: {
    marginTop: spacing.md,
    fontSize: font.body,
    lineHeight: 22,
    color: colors.primary,
    fontWeight: '600',
  },
});