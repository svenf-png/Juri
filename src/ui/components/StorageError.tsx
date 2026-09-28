import { Screen, ScreenTitle } from './Screen';

/** Anzeige, wenn die lokale Datenbank nicht antwortet (Speicherfehler, blockiertes Update). */
export function StorageError() {
  return (
    <Screen>
      <ScreenTitle lead="Bitte schließe Juri und öffne es erneut. Hilft das nicht, starte das Gerät neu.">
        Kein Zugriff auf den Speicher
      </ScreenTitle>
    </Screen>
  );
}
