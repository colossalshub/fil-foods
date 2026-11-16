/**
 * Guard against stacking native modals. React Native cannot reliably show a second
 * native Modal while another one is visible: on iOS the second waits until the first is
 * dismissed, and Android/web stacking depends on mount order. Every user-app modal goes
 * through AppModal, which reports here when it opens and closes. Opening a second one
 * while one is open is a bug: render the second view inside the open modal instead
 * (a page layer or an InlineDialog).
 */
export const NESTED_MODAL_MESSAGE =
  'AppModal: another AppModal is already open. Native platforms cannot show two modals at once; '
  + 'render this view inside the open modal (a page layer or InlineDialog) instead.';

let openCount = 0;
let reporter: (message: string) => void = (message) => {
  console.error(message);
};

/** Call when a modal becomes visible. Returns false (and reports) if another was already open. */
export function noteModalOpened(): boolean {
  openCount += 1;
  if (openCount > 1) {
    reporter(NESTED_MODAL_MESSAGE);
    return false;
  }
  return true;
}

export function noteModalClosed() {
  openCount = Math.max(0, openCount - 1);
}

export function openModalCount() {
  return openCount;
}

/** Tests only. */
export function __resetModalGuard(nextReporter?: (message: string) => void) {
  openCount = 0;
  reporter = nextReporter || ((message) => { console.error(message); });
}
