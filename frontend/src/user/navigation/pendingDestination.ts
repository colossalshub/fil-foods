let pending: string | null = null;

export function setPendingDestination(name: string | null) {
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
