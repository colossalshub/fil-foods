interface FaqNavigation {
  getState?: () => { routeNames?: string[] } | undefined;
  getParent?: () => FaqNavigation | undefined;
  navigate: (name: string, params?: object) => void;
}

/** USR-27: FAQ screen reachable from Help. */
export function openFaq(navigation: FaqNavigation | null | undefined) {
  let nav = navigation;
  while (nav) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('Faq')) {
      nav.navigate('Faq');
      return;
    }
    nav = nav.getParent?.();
  }
}