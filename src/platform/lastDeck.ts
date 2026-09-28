const KEY = 'juri:lastDeck';

/** Zuletzt betrachteter oder benutzter Stapel; nur eine Bequemlichkeit, fehlt der Speicher, gibt es keinen. */
export function readLastDeck(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberDeck(id: string): void {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Kein Speicher (privates Fenster, gesperrt): dann wird der Stapel nicht vorbelegt.
  }
}
