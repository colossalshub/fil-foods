import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import BackPageShell from '../../components/BackPageShell';
import PlanPicker from '../../components/PlanPicker';
import { useAuth } from '../../context/AuthContext';

export default function PlansScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [rememberedPeriod, setRememberedPeriod] = useState('weekly');
  const goBack = () => {
    if ((navigation as { canGoBack?: () => boolean }).canGoBack?.()) {
      (navigation as { goBack: () => void }).goBack();
    }
  };

  return (
    <BackPageShell title="Subscription" backLabel="Account" onBack={goBack}>
      <PlanPicker
        user={user}
        navigation={navigation}
        initialPeriod="weekly"
        rememberedPeriod={rememberedPeriod}
        onRememberPeriod={setRememberedPeriod}
      />
    </BackPageShell>
  );
}
