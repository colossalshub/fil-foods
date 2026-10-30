let pending = null;

export function setPendingDestination(name) {
  pending = name;
}

export function clearPendingDestination() {
  pending = null;
}

export function consumePendingDestination() {
  const name = pending;
  pending = null;
  return name;
}
