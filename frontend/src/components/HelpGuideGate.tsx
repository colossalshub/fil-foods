import { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AppGuidePanel from './AppGuidePanel';
import AppButton from './AppButton';
import { hasSeenHelpGuide, markHelpGuideSeen } from '../services/helpGuideService';
import { colors, font, spacing } from '../theme/theme';

export default function HelpGuideGate() {
  const { user } = useAuth();
  const eligible = Boolean(user?.id && user.role !== 'visitor' && user.profileComplete);
  const [offerGuide, setOfferGuide] = useState(false);

  useEffect(() => {
    if (!eligible) return undefined;
    let active = true;
    hasSeenHelpGuide().then((seen) => {
      if (active && !seen) setOfferGuide(true);
    });
    return () => {
      active = false;
    };
  }, [eligible, user?.id]);

  const visible = eligible && offerGuide;

  const dismiss = async () => {
    await markHelpGuideSeen();
    setOfferGuide(false);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={dismiss}>
      <View style={styles.wrap}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title} accessibilityRole="header" allowFontScaling>App guide</Text>
          <Text style={styles.lead} allowFontScaling>
            A quick tour of the main areas. You can reopen this guide anytime from Help.
          </Text>
          <AppGuidePanel />
          <AppButton title="Got it" onPress={dismiss} color={colors.action} accessibilityLabel="Got it" />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xxl },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.sm },
  lead: { fontSize: font.body, lineHeight: 24, color: colors.text, marginBottom: spacing.lg },
});
