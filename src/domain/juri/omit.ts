/** Kopie ohne die genannten Felder (für Union-Typen wie `Card` ohne Verlust der Varianten). */
export function omit<T extends object>(value: T, ...keys: string[]): T {
  const drop = new Set(keys);
  return Object.fromEntries(Object.entries(value).filter(([key]) => !drop.has(key))) as T;
}
