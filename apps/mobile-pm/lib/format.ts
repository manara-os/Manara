/**
 * Date and number formatting that does not depend on Intl.
 *
 * Hermes ships without Intl, so `toLocaleDateString('en-AE', { ... })` — which
 * works fine in the web app — resolves to undefined on device and throws
 * "TypeError: undefined is not a function", taking the whole screen down.
 * These helpers produce the same en-AE style output using plain arithmetic.
 */

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toDate = (value: string | number | Date): Date | null => {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "4 Aug 2026" */
export const formatDate = (value?: string | number | Date | null, fallback = '—'): string => {
  if (value == null) return fallback;
  const d = toDate(value);
  if (!d) return fallback;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

/** "4 Aug" */
export const formatDayMonth = (value?: string | number | Date | null, fallback = '—'): string => {
  if (value == null) return fallback;
  const d = toDate(value);
  if (!d) return fallback;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

/** "Tuesday, 4 August 2026" */
export const formatLongDate = (value?: string | number | Date | null, fallback = '—'): string => {
  const d = toDate(value ?? new Date());
  if (!d) return fallback;
  return `${DAYS_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
};

/** "1,234,567" — thousands separators without Intl. */
export const formatNumber = (value?: number | string | null): string => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n);
  const sign = rounded < 0 ? '-' : '';
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
