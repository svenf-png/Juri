/** Testdaten-Menü, nur in der Testinstanz (Entscheidung 10). */
import { replaceTables } from '@/data/backup';
import { addDemoDecks } from '@/demo/addDemoDecks';
import { demoTables } from '@/demo/demoProfile';
import { database } from '../app/database';

export async function loadDemoProfile(now = Date.now()): Promise<void> {
  await replaceTables(database(), demoTables(now));
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
