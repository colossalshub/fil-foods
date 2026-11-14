let pending = '';

export function setLoginNotice(message: string) {
  pending = message;
}

export function consumeLoginNotice() {
  const message = pending;
  pending = '';
  return message;
}
