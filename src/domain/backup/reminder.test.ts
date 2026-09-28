import { describe, expect, it } from 'vitest';
import { describeLastBackup, isBackupDue } from './reminder';

const DAY = 86_400_000;
const start = new Date(2026, 8, 1, 10).getTime();

describe('isBackupDue', () => {
  it('erinnert erst 14 Tage nach dem Onboarding, wenn es noch kein Backup gibt', () => {
    const state = { onboardedAt: start, lastBackupAt: null, newCardsSinceBackup: 0 };
    expect(isBackupDue(state, start + 13 * DAY)).toBe(false);
    expect(isBackupDue(state, start + 14 * DAY)).toBe(true);
  });

  it('zählt ab dem letzten Backup', () => {
    const state = { onboardedAt: start, lastBackupAt: start + 10 * DAY, newCardsSinceBackup: 0 };
    expect(isBackupDue(state, start + 20 * DAY)).toBe(false);
    expect(isBackupDue(state, start + 24 * DAY)).toBe(true);
  });

  it('erinnert nach 50 neuen Karten sofort', () => {
    const state = { onboardedAt: start, lastBackupAt: start, newCardsSinceBackup: 49 };
    expect(isBackupDue(state, start)).toBe(false);
    expect(isBackupDue({ ...state, newCardsSinceBackup: 50 }, start)).toBe(true);
  });

  it('erinnert nicht vor dem Onboarding', () => {
    expect(
      isBackupDue({ onboardedAt: null, lastBackupAt: null, newCardsSinceBackup: 0 }, start),
    ).toBe(false);
  });
});

describe('describeLastBackup', () => {
  const now = new Date(2026, 8, 28, 1, 30).getTime();

  it.each([
    [null, 'Noch keins'],
    [new Date(2026, 8, 28, 0, 5).getTime(), 'Heute'],
    [new Date(2026, 8, 27, 23, 50).getTime(), 'Gestern'],
    [new Date(2026, 8, 23, 12).getTime(), 'Vor 5 Tagen'],
    [now + DAY, 'Heute'],
  ])('%s → %s', (at, text) => {
    expect(describeLastBackup(at, now)).toBe(text);
  });
});
