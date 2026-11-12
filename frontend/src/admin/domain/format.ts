export function peso(amount: number) {
  const [whole, frac] = amount.toFixed(2).split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₱${withCommas}.${frac}`;
}

export function percentLabel(delta: number) {
  const rounded = Math.round(delta * 100);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded}%`;
}

export function parsePrice(raw: string) {
  const cleaned = raw.trim().replace(/₱/g, '').replace(/,/g, '').replace(/\s/g, '');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${String(hours).padStart(2, '0')}:${minutes} ${suffix}`;
}

export function splitList(value: string) {
  return value.split(',').map((part) => part.trim()).filter(Boolean);
}

export function avatarLetter(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'A';
}
