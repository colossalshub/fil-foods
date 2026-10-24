import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Linking, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import AppGuidePanel from '../components/AppGuidePanel';
import {
  FAQ_GROUPS,
  FAQ_NO_MATCH,
  ORDER_STEPS,
  contactInfo,
  getContactPhone,
  searchFaq,
  buildTelHref,
} from '../data/helpContent';
import { colors, card, font, spacing, touch } from '../theme/theme';

function SectionHeading({ children }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header" allowFontScaling>
      {children}
    </Text>
  );
}

function FaqBlock({ group, expandedId, onToggle }) {
  return (
    <View style={styles.faqGroup}>
      <Text style={styles.groupTitle} allowFontScaling>{group.title}</Text>
      {group.items.map((item) => {
        const open = expandedId === item.id;
        return (
          <View key={item.id} style={styles.faqItem}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.question}
              accessibilityState={{ expanded: open }}
              onPress={() => onToggle(open ? null : item.id)}
              style={styles.faqQuestionHit}
            >
              <Text style={styles.faqQuestion} allowFontScaling>{item.question}</Text>
              <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
            </Pressable>
            {open ? <Text style={styles.faqAnswer} allowFontScaling>{item.answer}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

export default function HelpScreen({ navigation, route }) {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [localGuide, setLocalGuide] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(false);

  const navWantsGuide = route.params?.showGuide === true;
  const guideOpen = !guideDismissed && (navWantsGuide || localGuide);

  const results = useMemo(() => searchFaq(query), [query]);
  const searching = query.trim().length > 0;

  const filteredGroups = useMemo(() => {
    if (!searching) return FAQ_GROUPS;
    const ids = new Set(results.map((r) => r.id));
    return FAQ_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => ids.has(item.id)),
    })).filter((group) => group.items.length > 0);
  }, [results, searching]);

  const openGuide = useCallback(() => {
    setGuideDismissed(false);
    setLocalGuide(true);
  }, []);

  const closeGuide = useCallback(() => {
    setLocalGuide(false);
    setGuideDismissed(true);
    if (navWantsGuide) {
      navigation.setParams({ showGuide: undefined });
    }
  }, [navWantsGuide, navigation]);

  const onCallSupport = useCallback(async () => {
    const href = buildTelHref(getContactPhone());
    if (Linking?.openURL) {
      await Linking.openURL(href);
    }
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={styles.backHit}
        >
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
          <Text style={styles.backText} allowFontScaling>Back</Text>
        </Pressable>
        <Text style={styles.title} accessibilityRole="header" allowFontScaling>Help</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <SectionHeading>How to place an order</SectionHeading>
        <View style={styles.card}>
          {ORDER_STEPS.map((step) => (
            <Text key={step.step} style={styles.stepLine} allowFontScaling>
              {`${step.step} ${step.title}`}
            </Text>
          ))}
        </View>

        <View style={styles.guideRow}>
          <SectionHeading>App guide</SectionHeading>
          <AppButton
            title="View guide"
            variant="outline"
            color={colors.primary}
            onPress={openGuide}
            style={styles.guideBtn}
          />
        </View>
        <Text style={styles.body} allowFontScaling>
          Step-by-step overview of Menu, Order, Tracking, and Profile.
        </Text>

        <SectionHeading>Frequently asked questions</SectionHeading>
        <AppInput
          label="Search help"
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search help"
          placeholder="Search questions"
        />
        {searching && results.length === 0 ? (
          <Text style={styles.noMatch} allowFontScaling accessibilityLiveRegion="polite">
            {FAQ_NO_MATCH}
          </Text>
        ) : null}
        {filteredGroups.map((group) => (
          <FaqBlock
            key={group.id}
            group={group}
            expandedId={expandedId}
            onToggle={setExpandedId}
          />
        ))}

        <SectionHeading>Contact</SectionHeading>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Call support at ${getContactPhone()}`}
            onPress={onCallSupport}
            style={styles.contactHit}
          >
            <Text style={styles.contactLink} allowFontScaling>{getContactPhone()}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Email support at ${contactInfo.email}`}
            onPress={() => Linking.openURL(`mailto:${contactInfo.email}`)}
            style={styles.contactHit}
          >
            <Text style={styles.contactLink} allowFontScaling>{contactInfo.email}</Text>
          </Pressable>
          <Text style={styles.body} allowFontScaling>{contactInfo.hours}</Text>
        </View>
      </ScrollView>

      <Modal visible={guideOpen} animationType="slide" onRequestClose={closeGuide}>
        <SafeAreaView style={styles.modalScreen}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalTitle} accessibilityRole="header" allowFontScaling>App guide</Text>
            <AppGuidePanel />
            <AppButton title="Close" onPress={closeGuide} color={colors.primary} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backHit: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: touch.min,
    minHeight: touch.min,
    paddingRight: spacing.sm,
  },
  backSpacer: { minWidth: touch.min },
  backText: { fontSize: font.body, color: colors.primary, fontWeight: '600', marginLeft: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: font.xl, fontWeight: '700', color: colors.primary },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  sectionTitle: { fontSize: font.lg, fontWeight: '700', color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { ...card, padding: spacing.lg, marginBottom: spacing.md },
  stepLine: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.xs },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.md },
  guideRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg },
  guideBtn: { marginLeft: spacing.md, flexShrink: 0 },
  noMatch: { fontSize: font.body, lineHeight: 24, color: colors.muted, marginBottom: spacing.md },
  faqGroup: { marginBottom: spacing.lg },
  groupTitle: { fontSize: font.body, fontWeight: '700', color: colors.secondary, marginBottom: spacing.sm },
  faqItem: { ...card, marginBottom: spacing.sm, overflow: 'hidden' },
  faqQuestionHit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  faqQuestion: { flex: 1, fontSize: font.body, lineHeight: 24, color: colors.text, paddingRight: spacing.sm },
  faqAnswer: {
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  contactHit: { minHeight: touch.min, justifyContent: 'center', marginBottom: spacing.xs },
  contactLink: { fontSize: font.body, lineHeight: 24, color: colors.action, fontWeight: '600' },
  modalScreen: { flex: 1, backgroundColor: colors.background },
  modalScroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  modalTitle: { fontSize: font.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.lg },
});
