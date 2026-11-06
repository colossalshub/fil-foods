interface HelpNavigation {
  getState?: () => { routeNames?: string[] } | undefined;
  getParent?: () => HelpNavigation | undefined;
  navigate: (name: string, params?: object) => void;
}

export function openHelp(
  navigation: HelpNavigation | null | undefined,
  options: { showGuide?: boolean } = {},
) {
  let nav = navigation;
  while (nav) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('Help')) {
      nav.navigate('Help', options.showGuide ? { showGuide: true } : {});
      return;
    }
    nav = nav.getParent?.();
  }
}
