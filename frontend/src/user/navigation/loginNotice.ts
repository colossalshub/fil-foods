let pending = '';
const listeners = new Set<(message: string) => void>();

export function setLoginNotice(message: string) {
  pending = message;
  // A Log in screen that is already open shows it straight away (e.g. an email link opened the web app).
  listeners.forEach((listener) => listener(consumeLoginNotice()));
}

export function consumeLoginNotice() {
  const message = pending;
  pending = '';
  return message;
}

export function subscribeLoginNotice(listener: (message: string) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
