// Story samples use a clock like 2026-10-12 09:15 AM.
export function formatTimestamp(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hr = String(hours % 12 || 12).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hr}:${min} ${ampm}`;
}

export function nowIso() {
  return new Date().toISOString();
}
