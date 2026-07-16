const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1) return '0 B';
  const exp = Math.min(UNITS.length - 1, Math.floor(Math.log10(bytes) / 3));
  const value = bytes / Math.pow(1000, exp);
  const rounded = value >= 100 || exp === 0 ? Math.round(value).toString() : value.toFixed(digits);
  return `${rounded} ${UNITS[exp]}`;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}
