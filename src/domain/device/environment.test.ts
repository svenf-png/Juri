import { describe, expect, it } from 'vitest';
import {
  environmentOf,
  fileCopy,
  gestureHints,
  installRequired,
  pointerVerbs,
  saveMode,
  type Platform,
} from './environment';

describe('environmentOf', () => {
  it.each([
    ['iPhone', 'ios'],
    ['iPad', 'ios'],
    ['Mac', 'desktop'],
    ['Andere', 'desktop'],
    ['Android', 'android'],
  ] as [Platform, string][])('%s ist %s', (platform, expected) => {
    expect(environmentOf(platform)).toBe(expected);
  });
});

describe('installRequired (A13)', () => {
  it('sperrt nur den Safari-Tab auf iPhone und iPad', () => {
    expect(installRequired('iPhone', false)).toBe(true);
    expect(installRequired('iPad', false)).toBe(true);
    expect(installRequired('iPhone', true)).toBe(false);
    expect(installRequired('iPad', true)).toBe(false);
  });

  it.each(['Mac', 'Andere', 'Android'] as Platform[])(
    'sperrt %s nie, installiert oder im Tab',
    (platform) => {
      expect(installRequired(platform, false)).toBe(false);
      expect(installRequired(platform, true)).toBe(false);
    },
  );
});

describe('saveMode', () => {
  it('lädt auf dem Desktop herunter, sonst über das Teilen-Menü', () => {
    expect(saveMode('desktop')).toBe('download');
    expect(saveMode('ios')).toBe('share');
    expect(saveMode('android')).toBe('share');
  });
});

describe('Texte', () => {
  it('Desktop klickt, Touch tippt', () => {
    expect(pointerVerbs('desktop')).toEqual({ tap: 'Klicken', tapOn: 'anklicken' });
    expect(pointerVerbs('ios')).toEqual({ tap: 'Tippen', tapOn: 'antippen' });
  });

  it('Desktop-Texte erwähnen weder iCloud noch iOS noch Dateien-App', () => {
    const copy = fileCopy('desktop');
    for (const text of Object.values(copy)) {
      expect(text).not.toMatch(/iCloud|iOS|In Dateien|Teilen/);
    }
    expect(copy.backupAction).toBe('Herunterladen');
  });

  it('iOS-Texte behalten die Anleitung für „In Dateien sichern“', () => {
    const copy = fileCopy('ios');
    expect(copy.backupTip).toContain('In Dateien sichern');
    expect(copy.storageHelp).toContain('iOS');
    expect(fileCopy('android')).toEqual(copy);
  });

  it('Hinweise nennen auf dem Desktop Maus und Rad statt Finger', () => {
    for (const text of Object.values(gestureHints('desktop'))) {
      expect(text).not.toMatch(/Finger|Pencil|antippen/);
    }
    expect(gestureHints('ios').zoom).toBe('Zwei Finger zum Zoomen');
    expect(gestureHints('android')).toEqual(gestureHints('ios'));
  });

  it('enthält keine Gedankenstriche', () => {
    for (const env of ['desktop', 'ios'] as const) {
      for (const text of [
        ...Object.values<string>(fileCopy(env)),
        ...Object.values<string>(gestureHints(env)),
      ]) {
        expect(text).not.toMatch(/[–—]/);
      }
    }
  });
});
