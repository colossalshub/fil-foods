// USR-04/05: a password-reset email link opened the app. RootNavigator shows only the
// New password screen until the user saves a password or goes back.
type Listener = (active: boolean) => void;
let active = false;
const listeners = new Set<Listener>();

export function setRecoveryMode(next: boolean) {
  if (active === next) return;
  active = next;
  listeners.forEach((listener) => listener(next));
}

export function recoveryModeActive() {
  return active;
}

export function subscribeRecoveryMode(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
