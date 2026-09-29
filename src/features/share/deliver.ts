import { saveMode } from '@/domain/device/environment';
import { canShareFiles, downloadFile, shareFiles } from '@/platform/share';
import { currentEnvironment } from '../app/install';

export type DeliverOutcome = 'geteilt' | 'geladen' | 'abgebrochen';

/**
 * Bringt eine Datei zum Nutzer: auf iOS und Android über das Teilen-Menü (nur nach dem
 * `canShare`-Test), sonst und auf dem Desktop als Download (Entscheidung 12). Muss direkt aus
 * einem Tippen aufgerufen werden; vor dem ersten `await` steht nichts, was Zeit kostet.
 */
export async function deliverFile(file: File): Promise<DeliverOutcome> {
  const share = saveMode(currentEnvironment()) === 'share' && canShareFiles(navigator, [file]);
  const shared = share ? await shareFiles(navigator, [file]) : null;
  if (shared === 'abgebrochen') return 'abgebrochen';
  if (shared === 'geteilt') return 'geteilt';
  downloadFile(document, file);
  return 'geladen';
}
