import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import {
  BACKUP_ERROR_MESSAGES,
  BACKUP_FORMAT_VERSION,
  BackupError,
  backupFileName,
  decodeBackup,
  encodeBackup,
  type BackupContent,
  type BackupErrorCode,
} from './codec';

const createdAt = new Date(2026, 8, 28, 20, 15).getTime();

function bytes(...values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer;
}

function sample(): BackupContent {
  return {
    schemaVersion: 3,
    createdAt,
    app: { instance: 'app', version: '0.2.0' },
    tables: {
      profile: [{ id: 'me', name: 'Sven', createdAt: 1, updatedAt: 2 }],
      media: [
        { id: 'b', mime: 'image/jpeg', data: bytes(1, 2, 3) },
        { id: 'a', parts: [{ page: 1, data: bytes(255, 0) }], note: null, ok: true },
      ],
      empty: [],
    },
  };
}

function manifestZip(manifest: unknown, files: Record<string, Uint8Array> = {}): Uint8Array {
  return zipSync({ 'manifest.json': strToU8(JSON.stringify(manifest)), ...files });
}

function validManifest(overrides: Record<string, unknown> = {}) {
  return {
    format: 'juri-backup',
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: 1,
    createdAt,
    app: { instance: 'test', version: '0.2.0' },
    tables: { meta: { file: 'tables/meta.json', count: 1 } },
    binaries: 0,
    ...overrides,
  };
}

function expectCode(run: () => unknown, code: BackupErrorCode) {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(BackupError);
    expect((error as BackupError).code).toBe(code);
    expect((error as BackupError).message).toBe(BACKUP_ERROR_MESSAGES[code]);
    return;
  }
  throw new Error(`Erwartet: BackupError ${code}`);
}

describe('encodeBackup und decodeBackup', () => {
  it('ergeben dieselben Daten, auch ArrayBuffer in verschachtelten Werten', () => {
    const content = sample();
    const decoded = decodeBackup(encodeBackup(content));
    expect(decoded).toEqual(content);
    const media = decoded.tables.media!;
    expect(new Uint8Array(media[0]!.data as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3]));
    const parts = media[1]!.parts as { data: ArrayBuffer }[];
    expect(parts[0]!.data).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(parts[0]!.data)).toEqual(new Uint8Array([255, 0]));
  });

  it('kodiert deterministisch: gleiche Daten, gleiche Bytes', () => {
    expect(encodeBackup(sample())).toEqual(encodeBackup(sample()));
    const again = encodeBackup(decodeBackup(encodeBackup(sample())));
    expect(again).toEqual(encodeBackup(sample()));
  });

  it('behält die Reihenfolge der Felder und Datensätze', () => {
    const decoded = decodeBackup(encodeBackup(sample()));
    expect(Object.keys(decoded.tables.profile![0]!)).toEqual([
      'id',
      'name',
      'createdAt',
      'updatedAt',
    ]);
    expect(decoded.tables.media!.map((m) => m.id)).toEqual(['b', 'a']);
  });

  it('lässt undefinierte Felder weg', () => {
    const content = sample();
    content.tables.profile = [{ id: 'me', extra: undefined }];
    expect(decodeBackup(encodeBackup(content)).tables.profile).toEqual([{ id: 'me' }]);
  });

  it.each([
    ['Date', new Date(0)],
    ['NaN', Number.NaN],
    ['Uint8Array', new Uint8Array(1)],
    ['Funktion', () => 1],
  ])('lehnt nicht speicherbare Werte ab: %s', (_, value) => {
    const content = sample();
    content.tables.profile = [{ id: 'me', value }];
    expect(() => encodeBackup(content)).toThrow(TypeError);
  });

  it('lehnt ungültige Tabellennamen ab', () => {
    const content = sample();
    content.tables['../x'] = [];
    expect(() => encodeBackup(content)).toThrow(TypeError);
  });
});

describe('decodeBackup erkennt fehlerhafte Dateien', () => {
  const meta = { 'tables/meta.json': strToU8('[{"key":"onboardedAt","value":1}]') };

  it('liest eine von Hand gebaute gültige Datei', () => {
    const decoded = decodeBackup(manifestZip(validManifest(), meta));
    expect(decoded).toEqual({
      schemaVersion: 1,
      createdAt,
      app: { instance: 'test', version: '0.2.0' },
      tables: { meta: [{ key: 'onboardedAt', value: 1 }] },
    });
  });

  it('meldet Dateien ohne ZIP-Signatur als kein Backup', () => {
    expectCode(() => decodeBackup(strToU8('%PDF-1.7')), 'kein-backup');
  });

  it('meldet ZIP ohne manifest.json oder mit fremdem Format als kein Backup', () => {
    expectCode(() => decodeBackup(zipSync({ 'a.txt': strToU8('a') })), 'kein-backup');
    expectCode(() => decodeBackup(manifestZip(validManifest({ format: 'juri' }))), 'kein-backup');
    expectCode(() => decodeBackup(manifestZip([1, 2])), 'kein-backup');
  });

  it('meldet neuere Formatversionen', () => {
    const manifest = validManifest({ formatVersion: BACKUP_FORMAT_VERSION + 1, extra: 1 });
    expectCode(() => decodeBackup(manifestZip(manifest)), 'neuere-version');
  });

  it.each([
    ['kaputtes JSON im Manifest', zipSync({ 'manifest.json': strToU8('{') })],
    ['fehlende Angaben', manifestZip(validManifest({ app: undefined }), meta)],
    ['unbekannte Felder', manifestZip(validManifest({ extra: true }), meta)],
    ['fehlende Tabellendatei', manifestZip(validManifest())],
    [
      'fremder Dateipfad',
      manifestZip(validManifest({ tables: { meta: { file: 'x.json', count: 1 } } }), {
        'x.json': strToU8('[]'),
      }),
    ],
    ['falsche Anzahl', manifestZip(validManifest(), { 'tables/meta.json': strToU8('[]') })],
    ['kein Array', manifestZip(validManifest(), { 'tables/meta.json': strToU8('{}') })],
    ['kein Objekt', manifestZip(validManifest(), { 'tables/meta.json': strToU8('[1]') })],
    [
      'Verweis auf fehlende Binärdaten',
      manifestZip(validManifest(), { 'tables/meta.json': strToU8('[{"data":{"$bin":0}}]') }),
    ],
    [
      'Binärdaten fehlen',
      manifestZip(validManifest({ binaries: 1 }), {
        'tables/meta.json': strToU8('[{"data":{"$bin":"0"}}]'),
      }),
    ],
    [
      '__proto__ im Datensatz',
      manifestZip(validManifest(), {
        'tables/meta.json': strToU8('[{"a":{"__proto__":{"x":1}}}]'),
      }),
    ],
  ])('%s → beschädigt', (_, file) => {
    expectCode(() => decodeBackup(file), 'beschaedigt');
  });

  it('meldet abgeschnittene Dateien als beschädigt', () => {
    const file = encodeBackup(sample());
    expectCode(() => decodeBackup(file.slice(0, file.length - 30)), 'beschaedigt');
  });

  it('bricht bei zu vielen Einträgen oder zu vielen Bytes ab', () => {
    const file = encodeBackup(sample());
    expectCode(() => decodeBackup(file, { maxEntries: 2, maxBytes: 1e9 }), 'zu-gross');
    expectCode(() => decodeBackup(file, { maxEntries: 100, maxBytes: 10 }), 'zu-gross');
  });
});

describe('backupFileName', () => {
  it('nennt Instanz und Tag der Gerätezeitzone', () => {
    const at = new Date(2026, 0, 5, 23, 59).getTime();
    expect(backupFileName(at, 'app')).toBe('Juri-Backup-2026-01-05.juri-backup');
    expect(backupFileName(at, 'test')).toBe('Juri-Test-Backup-2026-01-05.juri-backup');
  });
});
