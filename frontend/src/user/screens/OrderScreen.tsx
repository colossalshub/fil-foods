import { useEffect } from 'react';
import { View } from 'react-native';
import AppPageShell from '../components/AppPageShell';

/** Legacy route — checkout is a multi-step flow starting at ChoosePlan. */
export default function OrderScreen({ navigation }: {
  navigation: {
    replace?: (name: string) => void;
    getParent?: () => { navigate: (name: string, params?: object) => void } | undefined;
  };
}) {
  useEffect(() => {
    if (navigation.replace) {
      navigation.replace('ChoosePlan');
      return;
    }
    navigation.getParent?.()?.navigate('Meals', { screen: 'ChoosePlan' });
  }, [navigation]);

  return <AppPageShell edges={['top']} contentStyle={{ flex: 1 }}><View /></AppPageShell>;
}