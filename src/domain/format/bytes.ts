const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** Bytes lesbar auf Deutsch, z. B. „2,4 MB“ (Basis 1000 wie in iOS). */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '?';
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })} ${units[unit] ?? 'B'}`;
}
