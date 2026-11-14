import { useEffect, useState } from 'react';
import { Modal, View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import AppGuideExperience from './AppGuideExperience';
import AuthBackgroundDecor from './AuthBackgroundDecor';
import { hasSeenHelpGuide, markHelpGuideSeen } from '../services/helpGuideService';
import { colors, spacing } from '../theme/theme';

export default function HelpGuideGate() {
  const { user } = useAuth();
  const eligible = Boolean(user?.id && user.role !== 'visitor' && user.profileComplete);
  const [offerGuide, setOfferGuide] = useState(false);

  useEffect(() => {
    if (!eligible) return undefined;
    let active = true;
    hasSeenHelpGuide(user?.id).then((seen) => {
      if (active && !seen) setOfferGuide(true);
    });
    return () => {
      active = false;
    };
  }, [eligible, user?.id]);

  const visible = eligible && offerGuide;

  const dismiss = async () => {
    await markHelpGuideSeen(user?.id);
    setOfferGuide(false);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={dismiss}>
      <View style={styles.wrap}>
        <AuthBackgroundDecor />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <AppGuideExperience
              initialPhase="welcome"
              onComplete={dismiss}
              onDismiss={dismiss}
            />
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.authPage },
  safe: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
});