import { BUILD } from '@/app/build';
import { exportBackup, prepareRestore, restoreBackup } from '@/data/backup';
import { writeMeta } from '@/data/repositories/profile';
import {
  BackupError,
  backupFileName,
  decodeBackup,
  type BackupContent,
  type BackupInstance,
} from '@/domain/backup/codec';
import { describeLastBackup, isBackupDue } from '@/domain/backup/reminder';
import type { MetaValues } from '@/domain/model/records';
import { canShareFiles, downloadFile, shareFiles } from '@/platform/share';
import { database } from '../app/database';

/** MIME-Typ beim Teilen (ADR-003), bis der Geräte-Check einen besseren bestätigt. */
const BACKUP_MIME = 'application/octet-stream';

export function backupStatus(meta: Partial<MetaValues>, now: number) {
  const lastBackupAt = meta.lastBackupAt ?? null;
  return {
    label: describeLastBackup(lastBackupAt, now),
    due: isBackupDue(
      {
        onboardedAt: meta.onboardedAt ?? null,
        lastBackupAt,
        newCardsSinceBackup: meta.newCardsSinceBackup ?? 0,
      },
      now,
    ),
  };
}

export async function createBackupFile(now = Date.now()): Promise<File> {
  const instance = __JURI_INSTANCE__;
  const bytes = await exportBackup(database(), now, { instance, version: BUILD.version });
  return new File([bytes], backupFileName(now, instance), {
    type: BACKUP_MIME,
    lastModified: now,
  });
}

export type SaveOutcome = 'geteilt' | 'geladen' | 'abgebrochen';

/**
 * Öffnet das Teilen-Menü (darin „In Dateien sichern“), sonst einen Download. Muss direkt aus
 * einem Tippen heraus aufgerufen werden, sonst verweigert Safari das Teilen.
 */
export async function saveBackupFile(file: File): Promise<SaveOutcome> {
  let outcome: SaveOutcome = 'geladen';
  const shared = canShareFiles(navigator, [file]) ? await shareFiles(navigator, [file]) : null;
  if (shared === 'abgebrochen') return 'abgebrochen';
  if (shared === 'geteilt') outcome = 'geteilt';
  else downloadFile(document, file);
  const db = database();
  await db.transaction('rw', db.meta, async () => {
    await writeMeta(db, 'lastBackupAt', file.lastModified);
    await writeMeta(db, 'newCardsSinceBackup', 0);
  });
  return outcome;
}

export interface BackupPreview {
  content: BackupContent;
  profileName: string;
  createdAt: number;
  instance: BackupInstance;
}

/** Liest und prüft eine Datei vollständig, bevor gefragt wird, ob sie eingespielt werden soll. */
export async function readBackupFile(file: File): Promise<BackupPreview> {
  const content = decodeBackup(new Uint8Array(await file.arrayBuffer()));
  const profile = prepareRestore(content).profile?.[0];
  return {
    content,
    profileName: typeof profile?.name === 'string' ? profile.name : '',
    createdAt: content.createdAt,
    instance: content.app.instance,
  };
}

export async function applyBackup(preview: BackupPreview): Promise<void> {
  await restoreBackup(database(), preview.content);
}

export function backupErrorMessage(error: unknown): string {
  if (error instanceof BackupError) return error.message;
  if (errorName(error) === 'QuotaExceededError') {
    return 'Auf diesem Gerät ist nicht genug Speicher frei. Deine Daten sind unverändert.';
  }
  return 'Das hat nicht geklappt. Deine Daten sind unverändert.';
}

function errorName(error: unknown): string {
  if (typeof error !== 'object' || error === null) return '';
  const { name, inner } = error as { name?: unknown; inner?: unknown };
  if (name === 'QuotaExceededError') return name;
  return inner ? errorName(inner) : '';
}
