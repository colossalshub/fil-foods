import type { EdgeInsets } from 'react-native-safe-area-context';
import type { Palette } from './theme';

export type StaffNav = {
  navigate: (name: string, params?: object) => void;
  goBack: () => void;
  reset: (state: { index: number; routes: { name: string; params?: object }[] }) => void;
  canGoBack: () => boolean;
  getParent: () => StaffNav | undefined;
  getState: () => { routeNames?: string[] };
  dispatch: (action: unknown) => void;
  addListener: (
    event: 'beforeRemove',
    callback: (event: { preventDefault: () => void; data: { action: unknown } }) => void,
  ) => () => void;
  setOptions: (options: object) => void;
};

export type ScreenProps<P extends object = Record<string, never>> = {
  navigation: StaffNav;
  route: { params?: P; name?: string };
};

export function openRoot(navigation: StaffNav, name: string, params?: object) {
  let current: StaffNav | undefined = navigation;
  let found: StaffNav | undefined;
  while (current) {
    const names = current.getState?.()?.routeNames ?? [];
    if (names.includes(name)) found = current;
    current = current.getParent?.();
  }
  found?.navigate(name, params);
}

export function resetStaff(
  navigation: StaffNav,
  state: { index: number; routes: { name: string; params?: object }[] },
) {
  let current: StaffNav | undefined = navigation;
  let found: StaffNav | undefined;
  while (current) {
    const names = current.getState?.()?.routeNames ?? [];
    if (names.includes('StaffLogin')) found = current;
    current = current.getParent?.();
  }
  (found ?? navigation).reset(state);
}

export function tabBarStyle(insets: EdgeInsets, colors: Palette) {
  return {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 64 + insets.bottom,
    paddingBottom: insets.bottom,
    paddingTop: 6,
  };
}
