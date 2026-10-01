/** Testdaten-Menü, nur in der Testinstanz (Entscheidung 10). */
import { replaceTables } from '@/data/backup';
import { addDemoDecks } from '@/demo/addDemoDecks';
import { demoLargeTables } from '@/demo/demoLarge';
import { demoTables } from '@/demo/demoProfile';
import { database } from '../app/database';

export async function loadDemoProfile(now = Date.now()): Promise<void> {
  await replaceTables(database(), demoTables(now));
}

/** Großer Datensatz für Messungen (M12): 5.000 Karten, ersetzt alle Daten der Testinstanz. */
export async function loadDemoLarge(now = Date.now()): Promise<{ cards: number; decks: number }> {
  const { tables, cards, decks } = demoLargeTables(now);
  await replaceTables(database(), tables);
  return { cards, decks };
}

/** Fügt die Demo-Stapel hinzu, ohne vorhandene Daten zu ändern. */
export async function loadDemoDecks(now = Date.now()) {
  return addDemoDecks(database(), now);
}

/** Fügt das Demo-Skript (50-seitiges PDF, Frage und Abdeckung) hinzu; `false`, wenn es schon da ist. */
export { addDemoSkript as loadDemoSkript } from './skript';

export async function resetAllData(): Promise<void> {
  await replaceTables(database(), {});
}

export { prepareDemoJuri, saveDemoJuri } from './juri';
