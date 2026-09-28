/** Backup-Erinnerung nach 14 Tagen oder 50 neuen Karten (ADR-002). */

export const BACKUP_REMINDER_DAYS = 14;
export const BACKUP_REMINDER_NEW_CARDS = 50;

const DAY = 86_400_000;

export interface BackupState {
  onboardedAt: number | null;
  lastBackupAt: number | null;
  newCardsSinceBackup: number;
}

/** Gezählt ab dem letzten Backup, ohne Backup ab dem Onboarding. */
export function isBackupDue(state: BackupState, now: number): boolean {
  if (state.newCardsSinceBackup >= BACKUP_REMINDER_NEW_CARDS) return true;
  const since = state.lastBackupAt ?? state.onboardedAt;
  return since !== null && now - since >= BACKUP_REMINDER_DAYS * DAY;
}

/** „Heute“, „Gestern“, „Vor 3 Tagen“ nach Kalendertagen der Gerätezeitzone. */
export function describeLastBackup(lastBackupAt: number | null, now: number): string {
  if (lastBackupAt === null) return 'Noch keins';
  const days = calendarDaysBetween(lastBackupAt, now);
  if (days <= 0) return 'Heute';
  if (days === 1) return 'Gestern';
  return `Vor ${days} Tagen`;
}

function calendarDaysBetween(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  const start = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const end = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((end - start) / DAY);
}
