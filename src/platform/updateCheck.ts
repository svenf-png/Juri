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
  ask();
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState !== 'visible' || now() - last < UPDATE_CHECK_MIN_GAP_MS) return;
    last = now();
    ask();
  });
}
