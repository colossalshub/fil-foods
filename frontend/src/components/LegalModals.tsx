import { useRef } from 'react';
import { Pressable, Text, View, StyleSheet, type ScrollViewInstance } from 'react-native';
import InfoModal, { modalText } from './InfoModal';
import AppButton from './AppButton';
import { PRIVACY_TEXT, HELP_TEXT } from '../data/legal';
import { TERMS_LAST_UPDATED, TERMS_SECTIONS, TERMS_VERSION } from '../data/terms';
import { colors, font, spacing } from '../theme/theme';

export function HelpModal({ visible, onClose }: { visible?: boolean; onClose?: () => void }) {
  return (
    <InfoModal visible={visible} title="Help" onClose={onClose}>
      <Text style={modalText}>{HELP_TEXT}</Text>
    </InfoModal>
  );
}

export function PrivacyModal({ visible, onClose }: { visible?: boolean; onClose?: () => void }) {
  return (
    <InfoModal
      visible={visible} title="Privacy Policy" onClose={onClose}
      footer={<AppButton title="Close" onPress={onClose} variant="outline" color={colors.primary} />}
    >
      <Text style={modalText}>{PRIVACY_TEXT}</Text>
    </InfoModal>
  );
}

export function TermsModal({ visible, onClose, onAccept, acceptedAt }: {
  visible?: boolean;
  onClose?: () => void;
  onAccept?: () => void;
  acceptedAt?: string | null;
}) {
  const contentScrollRef = useRef<ScrollViewInstance>(null);
  const sectionOffsets = useRef<Record<number, number>>({});

  return (
    <InfoModal
      visible={visible}
      title="Terms and Conditions"
      onClose={onClose}
      contentScrollRef={contentScrollRef}
      footer={onAccept
        ? <AppButton title="I Agree" onPress={onAccept} color={colors.action} />
        : <AppButton title="Close" onPress={onClose} variant="outline" color={colors.primary} />}
    >
      <Text style={modalText}>Version {TERMS_VERSION} · Last updated {TERMS_LAST_UPDATED}</Text>
      <View style={styles.sectionLinks}>
        {TERMS_SECTIONS.map((section) => (
          <Pressable
            key={section.number}
            accessibilityRole="button"
            accessibilityLabel={`Go to section ${section.number}: ${section.title}`}
            onPress={() => {
              const y = sectionOffsets.current[section.number];
              if (y !== undefined) contentScrollRef.current?.scrollTo({ y, animated: true });
            }}
            style={styles.sectionLink}
          >
            <Text style={styles.sectionLinkText}>{section.number}. {section.title}</Text>
          </Pressable>
        ))}
      </View>
      {TERMS_SECTIONS.map((section) => (
        <View
          key={section.number}
          onLayout={(event) => {
            sectionOffsets.current[section.number] = event.nativeEvent.layout.y;
          }}
          style={styles.section}
        >
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {section.number}. {section.title}
          </Text>
          <Text style={modalText}>{section.text}</Text>
        </View>
      ))}
      {acceptedAt ? <Text style={[modalText, acceptedStyle]}>Accepted {acceptedAt}</Text> : null}
    </InfoModal>
  );
}

const acceptedStyle = { marginTop: 16, fontWeight: '600' as const };

const styles = StyleSheet.create({
  sectionLinks: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, marginBottom: spacing.md },
  sectionLink: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.soft,
    borderRadius: 12,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionLinkText: { color: colors.primary, fontSize: font.body, fontWeight: '600' },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    color: colors.primary,
    fontSize: font.lg,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: spacing.sm,
  },
});
