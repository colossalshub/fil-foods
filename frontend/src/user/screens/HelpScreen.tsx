import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, Linking, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import AppGuideExperience, { GuideReplayList, type GuideFlowPhase } from '../components/AppGuideExperience';
import AuthBackgroundDecor from '../components/AuthBackgroundDecor';
import { FEEDBACK_COPY, GUIDE_COPY } from '../data/messages';
import { openFeedback } from '../navigation/openFeedback';
import {
  FAQ_GROUPS,
  FAQ_NO_MATCH,
  ORDER_STEPS,
  contactInfo,
  getContactPhone,
  searchFaq,
  buildTelHref,
} from '../data/helpContent';
import type { ReactNode } from 'react';
import { colors, card, font, spacing, touch } from '../theme/theme';

function SectionHeading({ children }: { children?: ReactNode }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header" allowFontScaling>
      {children}
    </Text>
  );
}

function FaqBlock({ group, expandedId, onToggle }: {
  group: { title: string; items: Array<{ id: string; question: string; answer: string }> };
  expandedId: string | null;
  onToggle: (id: string | null) => void;
}) {
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

export default function HelpScreen({ navigation, route }: {
  navigation: {
    goBack: () => void;
    setParams: (params: object) => void;
    navigate: (name: string, params?: object) => void;
    getState?: () => { routeNames?: string[] };
    getParent?: () => {
      navigate: (name: string, params?: object) => void;
      getState?: () => { routeNames?: string[] };
      getParent?: () => unknown;
    } | undefined;
  };
  route: { params?: { showGuide?: boolean } };
}) {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [guidePhase, setGuidePhase] = useState<GuideFlowPhase>('welcome');
  const [guideStepIndex, setGuideStepIndex] = useState(0);

  const navWantsGuide = route.params?.showGuide === true;
  const guideOpen = guideModalOpen || (!guideDismissed && navWantsGuide);

  const results = useMemo(() => searchFaq(query), [query]);
  const searching = query.trim().length >= 2;

  const filteredGroups = useMemo(() => {
    if (!searching) return FAQ_GROUPS;
    const ids = new Set(results.map((r) => r.id));
    return FAQ_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => ids.has(item.id)),
    })).filter((group) => group.items.length > 0);
  }, [results, searching]);

  const openGuideAt = useCallback((phase: GuideFlowPhase, stepIndex = 0) => {
    setGuideDismissed(false);
    setGuidePhase(phase);
    setGuideStepIndex(stepIndex);
    setGuideModalOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    setGuideModalOpen(false);
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

        <SectionHeading>{GUIDE_COPY.appGuideTitle}</SectionHeading>
        <GuideReplayList
          onSelectStep={(index) => openGuideAt('steps', index)}
          onStartFromBeginning={() => openGuideAt('welcome')}
          style={styles.guideSection}
        />

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

        <SectionHeading>Comments and suggestions</SectionHeading>
        <View style={styles.card}>
          <Text style={styles.body} allowFontScaling>
            Send comments or suggestions about the meals and service.
          </Text>
          <AppButton
            title={FEEDBACK_COPY.title}
            color={colors.primary}
            onPress={() => openFeedback(navigation as Parameters<typeof openFeedback>[0])}
          />
        </View>

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
        <View style={styles.modalScreen}>
          <AuthBackgroundDecor />
          <SafeAreaView style={styles.modalSafe} edges={['top', 'bottom']}>
            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <AppGuideExperience
                key={`${guidePhase}-${guideStepIndex}-${guideOpen}`}
                initialPhase={guidePhase}
                initialStepIndex={guideStepIndex}
                welcomeHeader={guidePhase === 'welcome'}
                onComplete={closeGuide}
                onDismiss={closeGuide}
              />
            </ScrollView>
          </SafeAreaView>
        </View>
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
  guideSection: { marginBottom: spacing.md },
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
  modalScreen: { flex: 1, backgroundColor: colors.authPage },
  modalSafe: { flex: 1 },
  modalScroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
});
