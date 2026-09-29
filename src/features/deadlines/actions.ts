import {
  createDeadline,
  deleteDeadline,
  readDeadlines,
  updateDeadline,
  type NewDeadline,
} from '@/data/repositories/deadlines';
import { deadlinesIcs, icsFileName } from '@/domain/deadlines/calendar';
import { learningDay } from '@/domain/calendar/day';
import { saveMode } from '@/domain/device/environment';
import { newId } from '@/platform/id';
import { canShareFiles, downloadFile, shareFiles } from '@/platform/share';
import { database } from '../app/database';
import { currentEnvironment } from '../app/install';

export function addDeadline(input: NewDeadline) {
  return createDeadline(database(), newId(), input, Date.now());
}

export function changeDeadline(id: string, input: NewDeadline) {
  return updateDeadline(database(), id, input, Date.now());
}

export function removeDeadline(id: string) {
  return deleteDeadline(database(), id);
}

export type ExportOutcome = 'geteilt' | 'geladen' | 'abgebrochen' | 'nichts';

/**
 * Kalenderdatei (.ics) der kommenden Fristen: auf iOS und Android über das Teilen-Menü („In
 * Kalender“, „In Dateien sichern“), auf dem Desktop als Download (Entscheidung 12). Muss direkt
 * aus einem Tippen heraus laufen, sonst verweigert Safari das Teilen. `ids` schränkt auf einzelne
 * Fristen ein; ohne Angabe gehen alle mit.
 */
export async function exportDeadlines(ids?: readonly string[]): Promise<ExportOutcome> {
  const now = new Date();
  const list = (await readDeadlines(database())).filter((d) => !ids || ids.includes(d.id));
  const ics = deadlinesIcs(list, learningDay(now), now);
  if (ics === null) return 'nichts';
  const file = new File([ics], icsFileName(learningDay(now)), {
    type: 'text/calendar',
    lastModified: now.getTime(),
  });
  const share = saveMode(currentEnvironment()) === 'share' && canShareFiles(navigator, [file]);
  const shared = share ? await shareFiles(navigator, [file]) : null;
  if (shared === 'abgebrochen') return 'abgebrochen';
  if (shared === 'geteilt') return 'geteilt';
  downloadFile(document, file);
  return 'geladen';
}
