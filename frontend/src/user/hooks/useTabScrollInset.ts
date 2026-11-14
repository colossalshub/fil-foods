import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { floatingTabBottomInset } from '../navigation/floatingTabBar';

/** Extra bottom padding for scroll content inside the main tab navigator (floating bar overlay). */
export function useTabScrollInset(): number {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  if (tabBarHeight === undefined) {
    return 0;
  }
  return floatingTabBottomInset(insets);
}