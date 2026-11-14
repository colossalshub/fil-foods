interface FeedbackNavigation {
  getState?: () => { routeNames?: string[] } | undefined;
  getParent?: () => FeedbackNavigation | undefined;
  navigate: (name: string, params?: object) => void;
}

/** USR-29: Feedback is reachable from Help or from Account. */
export function openFeedback(navigation: FeedbackNavigation | null | undefined) {
  let nav = navigation;
  while (nav) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('Feedback')) {
      nav.navigate('Feedback');
      return;
    }
    if (Array.isArray(names) && names.includes('Main')) {
      nav.navigate('Main', { screen: 'Account', params: { screen: 'Feedback' } });
      return;
    }
    nav = nav.getParent?.();
  }
}