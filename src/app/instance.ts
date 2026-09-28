/**
 * Juri wird in zwei Instanzen gebaut (ADR-005):
 * - `app`:  die echte App unter /Juri/
 * - `test`: die Testinstanz „Juri Test“ unter /Juri/test/ mit eigener Datenbank
 *
 * Die Instanz wird über den Vite-Modus gewählt (`vite build --mode testinstanz`).
 * Diese Datei ist frei von Browser-APIs, damit vite.config.ts sie importieren kann.
 */

export type InstanceId = 'app' | 'test';

export interface InstanceConfig {
  id: InstanceId;
  /** Öffentlicher Basis-Pfad, immer mit Schrägstrich am Ende. */
  base: string;
  /** Build-Ausgabeordner relativ zum Projekt. */
  outDir: string;
  /** Name der IndexedDB-Datenbank; getrennt, damit sich die Instanzen nie berühren. */
  dbName: string;
  /** Anzeigename im Manifest und auf dem Home-Bildschirm. */
  name: string;
  /** Dateiname-Präfix der Icons in public/icons/. */
  iconPrefix: 'app' | 'test';
  /** Cache-Präfix des Service Workers. */
  cacheId: string;
}

export const TEST_MODE = 'testinstanz';

const INSTANCES: Record<InstanceId, InstanceConfig> = {
  app: {
    id: 'app',
    base: '/Juri/',
    outDir: 'dist',
    dbName: 'juri',
    name: 'Juri',
    iconPrefix: 'app',
    cacheId: 'juri',
  },
  test: {
    id: 'test',
    base: '/Juri/test/',
    outDir: 'dist/test',
    dbName: 'juri-test',
    name: 'Juri Test',
    iconPrefix: 'test',
    cacheId: 'juri-test',
  },
};

export function instanceForMode(mode: string): InstanceConfig {
  return mode === TEST_MODE ? INSTANCES.test : INSTANCES.app;
}

export function instanceById(id: InstanceId): InstanceConfig {
  return INSTANCES[id];
}

/**
 * Pfade, die der Service Worker der echten App nicht mit seiner Offline-Startseite
 * beantworten darf, weil sie zur Testinstanz gehören.
 */
export function navigateFallbackDenylist(config: InstanceConfig): RegExp[] {
  return config.id === 'app' ? [new RegExp(`^${escapeRegExp(INSTANCES.test.base)}`)] : [];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
