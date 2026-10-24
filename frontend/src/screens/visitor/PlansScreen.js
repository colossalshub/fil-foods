import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import PlanPicker from '../../components/PlanPicker';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing } from '../../theme/theme';

export default function PlansScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [rememberedPeriod, setRememberedPeriod] = useState('weekly');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title="Plans" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <PlanPicker
          user={user}
          navigation={navigation}
          initialPeriod="weekly"
          rememberedPeriod={rememberedPeriod}
          onRememberPeriod={setRememberedPeriod}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
});
