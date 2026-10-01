/**
 * Sucht aktiv nach einer neuen App-Version: sofort beim Start und jedes Mal, wenn die App wieder
 * in den Vordergrund kommt (höchstens einmal je Mindestabstand). Ohne diesen Anstoß entscheidet
 * allein der Browser, wann er nachsieht; eine geöffnete Home-Bildschirm-App bemerkt eine neue
 * Version dann unter Umständen erst spät. Das Ergebnis meldet `UpdatePrompt`.
 */

/** Mindestabstand zwischen zwei Nachfragen beim Zurückkehren in den Vordergrund. */
export const UPDATE_CHECK_MIN_GAP_MS = 60_000;

export interface UpdatableRegistration {
  update(): Promise<unknown>;
  /** Worker, der gerade installiert wird (fehlt bei Fremdobjekten in Tests). */
  readonly installing?: unknown;
  /** Worker, der die Seiten gerade bedient. */
  readonly active?: unknown;
}

/**
 * Gibt es schon eine Version, die aktualisiert werden kann? Bei der ersten Installation nicht:
 * Dort ruft jede neu geladene Seite sofort `update()` auf, und Firefox macht während der
 * Installation daraus einen zweiten Worker, der „Neue Version verfügbar“ meldet, obwohl es die
 * erste Version ist (in der CI beobachtet, M7).
 */
export function canUpdate(registration: UpdatableRegistration): boolean {
  return registration.active != null && registration.installing == null;
}

/**
 * Zeigt Juri den Hinweis? Nur, wenn eine ältere Version diese Seite bedient (`controlled`).
 * Eine Seite ohne Worker hat nichts zu aktualisieren. Während einer Lernrunde (`studying`) bleibt
 * der Hinweis zurück: Er läge sonst über den Bewertungsknöpfen. Danach erscheint er.
 */
export function shouldPromptForUpdate(
  needRefresh: boolean,
  controlled: boolean,
  studying = false,
): boolean {
  return needRefresh && controlled && !studying;
}

/** Läuft gerade eine Lernrunde? Die Adresse (ohne Basis) ist `/lernen`, gleich mit welcher Basis. */
export function isStudyPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '').endsWith('/lernen');
}

export interface VisibilitySource {
  readonly visibilityState: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
}

export function startUpdateChecks(
  registration: UpdatableRegistration,
  doc: VisibilitySource,
  now: () => number = Date.now,
): void {
  let last = now();
  // Offline oder bei einem Serverfehler schlägt die Nachfrage fehl; das ist kein Fehler der App.
  const ask = () => {
    registration.update().catch(() => undefined);
  };
  if (canUpdate(registration)) ask();
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState !== 'visible' || now() - last < UPDATE_CHECK_MIN_GAP_MS) return;
    last = now();
    if (canUpdate(registration)) ask();
  });
}
