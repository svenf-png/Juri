import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { buildIcs } from '@/domain/calendar/ics';

/** Kennung der Testdatei, damit der Import-Test sie wiedererkennt. */
export const CHECK_FORMAT = 'juri-geraetecheck';

/** Kleine .juri-Testdatei: ein echtes ZIP mit manifest.json wie das spätere Format (ADR-003). */
export function createJuriTestBytes(now: Date): Uint8Array {
  const manifest = {
    format: CHECK_FORMAT,
    formatVersion: 1,
    exportedAt: now.toISOString(),
    hinweis: 'Testdatei aus dem Juri-Geräte-Check, enthält keine Karten.',
  };
  return zipSync({
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'liesmich.txt': strToU8('Diese Datei testet Teilen und Import von Juri.\n'),
  });
}

export interface FileInspection {
  name: string;
  type: string;
  size: number;
  signature: string;
  isZip: boolean;
  checkFileFound: boolean;
  error: string | null;
}

/** Prüft eine gewählte Datei: ZIP-Signatur und ggf. die Geräte-Check-Kennung. */
export function inspectBytes(name: string, type: string, bytes: Uint8Array): FileInspection {
  const signature = Array.from(bytes.slice(0, 4), (b) => b.toString(16).padStart(2, '0')).join(' ');
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  let checkFileFound = false;
  let error: string | null = null;
  if (isZip) {
    try {
      const files = unzipSync(bytes, { filter: (f) => f.name === 'manifest.json' });
      const manifest = files['manifest.json'];
      if (manifest) {
        const parsed: unknown = JSON.parse(strFromU8(manifest));
        checkFileFound =
          typeof parsed === 'object' &&
          parsed !== null &&
          'format' in parsed &&
          parsed.format === CHECK_FORMAT;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'ZIP nicht lesbar';
    }
  }
  return { name, type, size: bytes.length, signature, isZip, checkFileFound, error };
}

export interface ShareVariant {
  id: string;
  label: string;
  make: (now: Date) => File;
}

function juriFile(name: string, type: string) {
  return (now: Date) => new File([createJuriTestBytes(now).slice()], name, type ? { type } : {});
}

/** Varianten, mit denen geprüft wird, welchen Dateityp das Teilen-Menü von iOS akzeptiert. */
export const SHARE_VARIANTS: readonly ShareVariant[] = [
  {
    id: 'juri-octet',
    label: 'Stapel.juri (application/octet-stream)',
    make: juriFile('Stapel.juri', 'application/octet-stream'),
  },
  {
    id: 'juri-zip',
    label: 'Stapel.juri (application/zip)',
    make: juriFile('Stapel.juri', 'application/zip'),
  },
  {
    id: 'juri-custom',
    label: 'Stapel.juri (application/x-juri)',
    make: juriFile('Stapel.juri', 'application/x-juri'),
  },
  { id: 'juri-none', label: 'Stapel.juri (ohne Typ)', make: juriFile('Stapel.juri', '') },
  {
    id: 'juri-zipname',
    label: 'Stapel.juri.zip (application/zip)',
    make: juriFile('Stapel.juri.zip', 'application/zip'),
  },
  { id: 'ics', label: 'Termin.ics (text/calendar)', make: (now) => icsFile(now) },
  {
    id: 'txt',
    label: 'Notiz.txt (text/plain, Vergleich)',
    make: () => new File(['Juri'], 'Notiz.txt', { type: 'text/plain' }),
  },
];

/** Testtermin morgen 18:00 Ortszeit mit Erinnerung 15 Minuten vorher. */
export function icsFile(now: Date): File {
  const start = new Date(now);
  start.setDate(start.getDate() + 1);
  start.setHours(18, 0, 0, 0);
  const ics = buildIcs({
    uid: `geraetecheck-${now.getTime()}@juri`,
    title: 'Juri: Lernzeit (Test)',
    description: 'Testtermin aus dem Juri-Geräte-Check. Kann gelöscht werden.',
    start,
    durationMinutes: 30,
    alarmMinutesBefore: 15,
    now,
  });
  return new File([ics], 'Juri-Lernzeit.ics', { type: 'text/calendar' });
}
