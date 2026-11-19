import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import AppModal from './AppModal';
import { useSafeAreaPadding } from './AppPageShell';
import { useAuth } from '../context/AuthContext';
import AppGuideExperience from './AppGuideExperience';
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
    <AppModal visible={visible} animationType="slide" onRequestClose={dismiss}>
      <View style={styles.wrap}>
        <GuideSafeArea>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <AppGuideExperience
              initialPhase="welcome"
              onComplete={dismiss}
              onDismiss={dismiss}
            />
          </ScrollView>
        </GuideSafeArea>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.page },
  safe: { flex: 1 },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
});
/** Pads the guide with the modal's own safe-area insets (see AppModal). */
function GuideSafeArea({ children }: { children: ReactNode }) {
  const padding = useSafeAreaPadding(['top', 'bottom']);
  return <View style={[styles.safe, padding]}>{children}</View>;
}
