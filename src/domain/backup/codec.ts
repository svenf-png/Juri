/**
 * Backup-Datei `.juri-backup` (ADR-006): ZIP mit `manifest.json`, je Tabelle einer JSON-Datei
 * (`tables/<name>.json`) und Binärdaten (`bin/<n>`, z. B. Medien als ArrayBuffer, ADR-002).
 *
 * Reine Funktionen: Kodieren ist deterministisch (gleiche Daten und gleicher Zeitpunkt ergeben
 * dieselben Bytes), Dekodieren prüft Aufbau und Grenzen, bevor etwas gespeichert wird. Ob die
 * Datensätze selbst gültig sind, prüft die Datenschicht je Tabelle (RECORD_SCHEMAS).
 */
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { z } from '../zod';

export const BACKUP_FORMAT = 'juri-backup';
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_EXTENSION = '.juri-backup';

export type BackupRecord = Record<string, unknown>;
export type BackupTables = Record<string, BackupRecord[]>;
export type BackupInstance = 'app' | 'test';

export interface BackupContent {
  /** Version des Datenbankschemas, aus der die Tabellen stammen (src/data/migrations.ts). */
  schemaVersion: number;
  createdAt: number;
  app: { instance: BackupInstance; version: string };
  tables: BackupTables;
}

export type BackupErrorCode = 'kein-backup' | 'beschaedigt' | 'neuere-version' | 'zu-gross';

export const BACKUP_ERROR_MESSAGES: Readonly<Record<BackupErrorCode, string>> = {
  'kein-backup': 'Diese Datei ist kein Juri-Backup.',
  beschaedigt: 'Das Backup ist beschädigt und kann nicht eingespielt werden.',
  'neuere-version':
    'Das Backup stammt aus einer neueren Juri-Version. Bitte aktualisiere Juri zuerst.',
  'zu-gross': 'Das Backup ist zu groß für dieses Gerät.',
};

export class BackupError extends Error {
  readonly code: BackupErrorCode;

  constructor(code: BackupErrorCode, options?: ErrorOptions) {
    super(BACKUP_ERROR_MESSAGES[code], options);
    this.name = 'BackupError';
    this.code = code;
  }
}

export interface BackupLimits {
  maxEntries: number;
  maxBytes: number;
}

/** Grenzen beim Entpacken, damit eine manipulierte Datei das Gerät nicht überlastet. */
export const BACKUP_LIMITS: BackupLimits = { maxEntries: 20_000, maxBytes: 1_000_000_000 };

const TABLE_NAME = /^[a-z][A-Za-z0-9]{0,39}$/;
const BINARY_KEY = '$bin';
const MANIFEST = 'manifest.json';

const manifestSchema = z.strictObject({
  format: z.literal(BACKUP_FORMAT),
  formatVersion: z.number().int().min(1).max(BACKUP_FORMAT_VERSION),
  schemaVersion: z.number().int().min(1),
  createdAt: z.number().int().nonnegative(),
  app: z.strictObject({ instance: z.enum(['app', 'test']), version: z.string().max(40) }),
  tables: z.record(
    z.string().regex(TABLE_NAME),
    z.strictObject({ file: z.string(), count: z.number().int().nonnegative() }),
  ),
  binaries: z.number().int().nonnegative(),
});

/** Dateiname mit Datum der Gerätezeitzone, z. B. „Juri-Backup-2026-09-28.juri-backup“. */
export function backupFileName(createdAt: number, instance: BackupInstance): string {
  const d = new Date(createdAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return `${instance === 'test' ? 'Juri-Test' : 'Juri'}-Backup-${day}${BACKUP_EXTENSION}`;
}

export function encodeBackup(content: BackupContent): Uint8Array<ArrayBuffer> {
  const binaries: Uint8Array[] = [];
  const tableFiles: [string, Uint8Array][] = [];
  const tables: Record<string, { file: string; count: number }> = {};
  for (const name of Object.keys(content.tables).sort()) {
    if (!TABLE_NAME.test(name)) throw new TypeError(`Ungültiger Tabellenname: ${name}`);
    const records = content.tables[name] ?? [];
    const file = `tables/${name}.json`;
    tableFiles.push([file, strToU8(JSON.stringify(records.map((r) => pack(r, binaries))))]);
    tables[name] = { file, count: records.length };
  }
  const manifest = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: content.schemaVersion,
    createdAt: content.createdAt,
    app: content.app,
    tables,
    binaries: binaries.length,
  };
  const mtime = content.createdAt;
  const zip: Zippable = {
    [MANIFEST]: [strToU8(JSON.stringify(manifest, null, 2)), { level: 6, mtime }],
  };
  for (const [file, data] of tableFiles) zip[file] = [data, { level: 6, mtime }];
  // Medien sind meist schon komprimiert (JPEG, PDF) und werden nur abgelegt.
  binaries.forEach((data, i) => {
    zip[`bin/${i}`] = [data, { level: 0, mtime }];
  });
  return zipSync(zip);
}

export function decodeBackup(
  bytes: Uint8Array,
  limits: BackupLimits = BACKUP_LIMITS,
): BackupContent {
  if (!isZip(bytes)) throw new BackupError('kein-backup');
  const files = unzip(bytes, limits);
  const manifestBytes = files[MANIFEST];
  if (!manifestBytes) throw new BackupError('kein-backup');
  const raw = parseJson(manifestBytes);
  if (!isPlainObject(raw) || raw.format !== BACKUP_FORMAT) throw new BackupError('kein-backup');
  if (typeof raw.formatVersion === 'number' && raw.formatVersion > BACKUP_FORMAT_VERSION) {
    throw new BackupError('neuere-version');
  }
  const parsed = manifestSchema.safeParse(raw);
  if (!parsed.success) throw new BackupError('beschaedigt', { cause: parsed.error });
  const manifest = parsed.data;

  const binaries = Array.from({ length: manifest.binaries }, (_, i) => files[`bin/${i}`]);
  const tables: BackupTables = {};
  for (const [name, { file, count }] of Object.entries(manifest.tables)) {
    const data = file === `tables/${name}.json` ? files[file] : undefined;
    if (!data) throw new BackupError('beschaedigt');
    const records = parseJson(data);
    if (!Array.isArray(records) || records.length !== count || !records.every(isPlainObject)) {
      throw new BackupError('beschaedigt');
    }
    tables[name] = records.map((r) => unpack(r, binaries) as BackupRecord);
  }
  return {
    schemaVersion: manifest.schemaVersion,
    createdAt: manifest.createdAt,
    app: manifest.app,
    tables,
  };
}

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function unzip(bytes: Uint8Array, limits: BackupLimits): Record<string, Uint8Array> {
  let entries = 0;
  let total = 0;
  try {
    return unzipSync(bytes, {
      filter(file) {
        entries += 1;
        total += file.originalSize;
        if (entries > limits.maxEntries || total > limits.maxBytes) {
          throw new BackupError('zu-gross');
        }
        return true;
      },
    });
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError('beschaedigt', { cause: error });
  }
}

function parseJson(data: Uint8Array): unknown {
  try {
    return JSON.parse(strFromU8(data));
  } catch (error) {
    throw new BackupError('beschaedigt', { cause: error });
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return Object.prototype.toString.call(value) === '[object ArrayBuffer]';
}

/** Macht einen Datensatz JSON-fähig; ArrayBuffer wandern als Verweis in `bin/<n>`. */
function pack(value: unknown, binaries: Uint8Array[]): unknown {
  if (isArrayBuffer(value)) {
    binaries.push(new Uint8Array(value.slice(0)));
    return { [BINARY_KEY]: binaries.length - 1 };
  }
  if (Array.isArray(value)) return value.map((v: unknown) => pack(v, binaries));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (v !== undefined) out[key] = pack(v, binaries);
    }
    return out;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new TypeError(
    `Wert ist nicht für ein Backup geeignet: ${Object.prototype.toString.call(value)}`,
  );
}

function unpack(value: unknown, binaries: (Uint8Array | undefined)[]): unknown {
  if (Array.isArray(value)) return value.map((v: unknown) => unpack(v, binaries));
  if (!isPlainObject(value)) return value;
  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === BINARY_KEY) {
    const index = value[BINARY_KEY];
    const data = typeof index === 'number' ? binaries[index] : undefined;
    if (!data) throw new BackupError('beschaedigt');
    return data.slice().buffer;
  }
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (key === '__proto__') throw new BackupError('beschaedigt');
    out[key] = unpack(value[key], binaries);
  }
  return out;
}
