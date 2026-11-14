import { useCallback, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, Linking, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../components/AppButton';
import BackPageShell from '../components/BackPageShell';
import AppGuideExperience, { GuideReplayList, type GuideFlowPhase } from '../components/AppGuideExperience';
import { FAQ_COPY, FEEDBACK_COPY, GUIDE_COPY } from '../data/messages';
import { openFeedback } from '../navigation/openFeedback';
import {
  ORDER_STEPS,
  contactInfo,
  getContactPhone,
  buildTelHref,
} from '../data/helpContent';
import { openFaq } from '../navigation/openFaq';
import type { ReactNode } from 'react';
import { colors, card, font, spacing, touch } from '../theme/theme';

function SectionHeading({ children }: { children?: ReactNode }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header" allowFontScaling>
      {children}
    </Text>
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
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [guidePhase, setGuidePhase] = useState<GuideFlowPhase>('welcome');
  const [guideStepIndex, setGuideStepIndex] = useState(0);

  const navWantsGuide = route.params?.showGuide === true;
  const guideOpen = guideModalOpen || (!guideDismissed && navWantsGuide);

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
    <>
      <BackPageShell title="Help" onBack={() => navigation.goBack()}>
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
        <Pressable
          accessibilityRole="button"
          onPress={() => openFaq(navigation as Parameters<typeof openFaq>[0])}
          style={styles.faqLinkCard}
        >
          <Text style={styles.faqLinkTitle} allowFontScaling>{FAQ_COPY.title}</Text>
          <Text style={styles.faqLinkBody} allowFontScaling>{FAQ_COPY.openFromHelp}</Text>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} style={styles.faqLinkIcon} />
        </Pressable>

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
      </BackPageShell>

      <Modal visible={guideOpen} animationType="slide" onRequestClose={closeGuide}>
        <BackPageShell
          title={GUIDE_COPY.appGuideTitle}
          onBack={closeGuide}
          edges={['top', 'bottom']}
          scrollContentStyle={styles.guideScroll}
        >
          <AppGuideExperience
            key={`${guidePhase}-${guideStepIndex}-${guideOpen}`}
            initialPhase={guidePhase}
            initialStepIndex={guideStepIndex}
            welcomeHeader={guidePhase === 'welcome'}
            onComplete={closeGuide}
            onDismiss={closeGuide}
          />
        </BackPageShell>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: font.lg, fontWeight: '700', color: colors.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { ...card, padding: spacing.lg, marginBottom: spacing.md },
  stepLine: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.xs },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.md },
  guideSection: { marginBottom: spacing.md },
  faqLinkCard: {
    ...card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    minHeight: touch.min,
  },
  faqLinkTitle: {
    fontSize: font.lg,
    fontWeight: '700',
    color: colors.primary,
    width: '100%',
    marginBottom: spacing.xs,
  },
  faqLinkBody: {
    flex: 1,
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
    paddingRight: spacing.sm,
  },
  faqLinkIcon: { alignSelf: 'center' },
  contactHit: { minHeight: touch.min, justifyContent: 'center', marginBottom: spacing.xs },
  contactLink: { fontSize: font.body, lineHeight: 24, color: colors.action, fontWeight: '600' },
  guideScroll: { paddingTop: spacing.lg },
});