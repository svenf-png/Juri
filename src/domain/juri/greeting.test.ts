import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildGreeting, buildPackage, greetingFileName } from './build';
import { decodeGreeting, decodeJuri, encodeGreeting, encodeJuri } from './codec';
import { JuriError, MAX_HIGH_FIVES_PER_FILE, type GreetingManifest } from './format';
import { NOW, SOURCE, pack } from './testkit';

const manifest = (over: Partial<GreetingManifest> = {}): GreetingManifest => ({
  format: 'juri-gruss',
  formatVersion: 1,
  createdAt: NOW,
  app: { version: '0.12.0' },
  sender: { name: 'Mara', id: 'mara-1' },
  highFives: [{ id: 'h1', at: NOW, to: 'ich-1', win: '12 Tage in Folge' }],
  ...over,
});

const raw = (m: unknown, extra: Record<string, Uint8Array> = {}) =>
  zipSync({ 'manifest.json': strToU8(JSON.stringify(m)), ...extra });

const code = (fn: () => unknown): string => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(JuriError);
    return (error as JuriError).code;
  }
  return 'nicht abgelehnt';
};

describe('Gruß-Datei', () => {
  it('Roundtrip und deterministisch', () => {
    const m = manifest({ achievements: { streak: 12, reviews: 5, created: 3, milestones: [] } });
    const bytes = encodeGreeting(m);
    expect(encodeGreeting(m)).toEqual(bytes);
    expect(decodeGreeting(bytes)).toEqual(m);
  });

  it('wird aus Absender, High fives und Schalter gebaut; die Mitreise-Schalter wirkt auf den Snapshot', () => {
    const base = {
      senderId: 'ich-1',
      senderName: 'Sven',
      highFives: [{ id: 'h', at: 1, to: 'mara-1' }],
      now: NOW,
      appVersion: '0.12.0',
    };
    const on = buildGreeting({
      ...base,
      achievements: { streak: 1, reviews: 1, created: 1, milestones: [] },
    });
    expect(on.achievements).toBeDefined();
    expect(on.sender).toEqual({ name: 'Sven', id: 'ich-1' });
    expect(buildGreeting({ ...base, achievements: null }).achievements).toBeUndefined();
    expect(() => buildGreeting({ ...base, achievements: null, highFives: [] })).toThrow(RangeError);
    expect(decodeGreeting(encodeGreeting(on)).highFives).toHaveLength(1);
  });

  it('Dateiname', () => {
    expect(greetingFileName('Sven')).toBe('High five von Sven.juri-gruss');
    expect(greetingFileName('a/b:c')).toBe('High five von a b c.juri-gruss');
    expect(greetingFileName('')).toBe('High five.juri-gruss');
  });

  it('leere, fremde und verkehrte Dateien', () => {
    expect(code(() => decodeGreeting(new Uint8Array()))).toBe('leer');
    expect(code(() => decodeGreeting(strToU8('kein zip')))).toBe('kein-juri');
    expect(code(() => decodeGreeting(zipSync({ 'x.txt': strToU8('x') })))).toBe('kein-juri');
    expect(code(() => decodeGreeting(raw([1])))).toBe('kein-juri');
    expect(code(() => decodeGreeting(raw({ format: 'anderes' })))).toBe('kein-juri');
    // Ein Stapel ist keine Gruß-Datei, ein Backup auch nicht.
    expect(code(() => decodeGreeting(encodeJuri(pack())))).toBe('ist-stapel');
    expect(code(() => decodeGreeting(raw({ format: 'juri-backup' })))).toBe('ist-backup');
  });

  it('manipulierte Dateien werden abgelehnt, bevor etwas gespeichert wird', () => {
    const bad = (m: unknown) => code(() => decodeGreeting(raw(m)));
    expect(code(() => decodeGreeting(zipSync({ 'manifest.json': strToU8('{kaputt') })))).toBe(
      'beschaedigt',
    );
    // Fremder Eintrag im ZIP, auch eine Karten-Datei oder ein Medium.
    expect(code(() => decodeGreeting(raw(manifest(), { 'evil.txt': strToU8('x') })))).toBe(
      'beschaedigt',
    );
    expect(code(() => decodeGreeting(raw(manifest(), { 'cards.json': strToU8('{}') })))).toBe(
      'beschaedigt',
    );
    expect(bad({ ...manifest(), extra: 1 })).toBe('beschaedigt');
    expect(bad({ ...manifest(), sender: { name: 'Mara' } })).toBe('beschaedigt');
    expect(bad({ ...manifest(), sender: { name: 'Mara', id: '../x' } })).toBe('beschaedigt');
    expect(bad({ ...manifest(), sender: { name: '  ', id: 'x' } })).toBe('beschaedigt');
    expect(bad({ ...manifest(), highFives: [] })).toBe('beschaedigt');
    expect(bad({ ...manifest(), highFives: [{ id: 'h', at: 'jetzt' }] })).toBe('beschaedigt');
    expect(bad({ ...manifest(), highFives: [{ id: 'h', at: 1, win: 'x'.repeat(81) }] })).toBe(
      'beschaedigt',
    );
    expect(bad({ ...manifest(), highFives: [{ id: 'h', at: 1, to: 5 }] })).toBe('beschaedigt');
    expect(bad({ ...manifest(), highFives: [{ id: 'h', at: -1 }] })).toBe('beschaedigt');
    expect(bad({ ...manifest(), highFives: [{ id: 'h', at: 1, text: 'alt' }] })).toBe(
      'beschaedigt',
    );
    const many = Array.from({ length: MAX_HIGH_FIVES_PER_FILE + 1 }, (_, i) => ({
      id: `h${String(i)}`,
      at: i,
    }));
    expect(bad({ ...manifest(), highFives: many })).toBe('beschaedigt');
  });

  it('Datei aus einer neueren Version wird mit eigener Meldung abgelehnt', () => {
    expect(code(() => decodeGreeting(raw({ ...manifest(), formatVersion: 2 })))).toBe(
      'neuere-version',
    );
    expect(code(() => decodeJuri(raw({ format: 'juri', formatVersion: 2 })))).toBe(
      'neuere-version',
    );
  });

  it('decodeJuri erkennt eine Gruß-Datei und meldet sie', () => {
    expect(code(() => decodeJuri(encodeGreeting(manifest())))).toBe('ist-gruss');
  });
});

describe('Absender-ID und Mitreise im Manifest', () => {
  const choice = {
    deckIds: ['deck-a'],
    notes: false,
    achievements: null,
    senderName: 'Sven',
    now: NOW,
    appVersion: '0.12.0',
  } as const;

  it('die ID reist mit dem Absender, ohne ID bleibt die Datei wie in M10', () => {
    const withId = buildPackage(SOURCE, { ...choice, senderId: 'ich-1' }).pack;
    expect(withId.manifest.sender).toEqual({ name: 'Sven', id: 'ich-1' });
    expect(decodeJuri(encodeJuri(withId)).manifest.sender?.id).toBe('ich-1');
    const without = buildPackage(SOURCE, choice).pack;
    expect(without.manifest.sender).toEqual({ name: 'Sven' });
    expect(decodeJuri(encodeJuri(without)).manifest.sender?.id).toBeUndefined();
  });

  it('High fives reisen nur mit eingeschaltetem Erfolgs-Snapshot (A9-Schalter)', () => {
    const highFives = [{ id: 'h1', at: 1, to: 'mara-1', win: 'x' }];
    const achievements = { streak: 1, reviews: 1, created: 1, milestones: [] };
    const on = buildPackage(SOURCE, { ...choice, senderId: 'i', achievements, highFives }).pack;
    expect(decodeJuri(encodeJuri(on)).manifest.highFives).toEqual(highFives);
    const off = buildPackage(SOURCE, { ...choice, senderId: 'i', highFives }).pack;
    expect(off.manifest.highFives).toBeUndefined();
    expect(off.manifest.achievements).toBeUndefined();
  });

  it('eine ungültige Absender-ID macht die Datei ungültig', () => {
    const base = pack();
    const forged = {
      ...base,
      manifest: { ...base.manifest, sender: { name: 'X', id: '../etc' } },
    };
    expect(code(() => decodeJuri(encodeJuri(forged)))).toBe('beschaedigt');
  });
});
