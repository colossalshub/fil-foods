/**
 * @param {import('@react-navigation/native').NavigationProp<any>} navigation
 * @param {{ showGuide?: boolean }} [options]
 */
export function openHelp(navigation, options = {}) {
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
