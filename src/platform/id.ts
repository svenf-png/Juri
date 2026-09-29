/** Neue zufällige ID für Datensätze (UUID v4; in Safari ab 15.4 verfügbar, Mindestversion ist iOS 18). */
export function newId(): string {
  return crypto.randomUUID();
}
