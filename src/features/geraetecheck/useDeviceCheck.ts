import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildLabel, BUILD } from '@/app/build';
import { instanceById } from '@/app/instance';
import { formatBytes } from '@/domain/format/bytes';
import { copyText } from '@/platform/clipboard';
import {
  describeUserAgent,
  isStandalone,
  majorVersion,
  readSafeAreaInsets,
} from '@/platform/device';
import { blobRoundtrip, getValue, openProbeDb, putValue, deleteValue } from '@/platform/idbProbe';
import { decodeImage, encodeImage } from '@/platform/image';
import { canShareFiles, downloadFile, shareFiles } from '@/platform/share';
import { readStorageStatus, requestPersistentStorage } from '@/platform/storage';
import { setSurfaceColor } from '@/platform/theme';
import {
  buildReport,
  type Answer,
  type CheckResult,
  type CheckStatus,
  type SectionId,
} from './report';
import { SHARE_VARIANTS, icsFile, inspectBytes } from './testFiles';

const MIN_IOS = 18;
const BLOB_BYTES = 50 * 1024 * 1024;
const MARKER_KEY = 'marker';

interface Entry extends CheckResult {
  section: SectionId;
}

type Results = Record<string, Entry>;

function yesNo(value: boolean): string {
  return value ? 'ja' : 'nein';
}

function ms(value: number): string {
  return `${Math.round(value).toLocaleString('de-DE')} ms`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * Steuert den Geräte-Check. Automatische Prüfungen laufen beim Öffnen, alles, was eine
 * Nutzergeste braucht (Teilen, Datei wählen, persist), über Aktionen.
 */
export function useDeviceCheck(instanceId: 'app' | 'test') {
  const instance = instanceById(instanceId);
  const probeDb = `${instance.dbName}-geraetecheck`;
  const [results, setResults] = useState<Results>({});
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [surfaceOn, setSurfaceOn] = useState(false);

  const set = useCallback(
    (id: string, section: SectionId, label: string, value: string, status: CheckStatus) => {
      setResults((prev) => ({ ...prev, [id]: { section, label, value, status } }));
    },
    [],
  );

  const runAutomatic = useCallback(async () => {
    // Teilweise optional, weil nicht jeder Browser jede API anbietet (z. B. ohne HTTPS).
    const nav = navigator as Partial<Navigator> & {
      userAgent: string;
      maxTouchPoints: number;
      standalone?: boolean;
    };
    const device = describeUserAgent(nav.userAgent, nav.maxTouchPoints);
    const major = majorVersion(device.osVersion);
    set(
      'geraet',
      'umgebung',
      'Gerät',
      device.platform + (device.desktopUserAgent ? ' (Desktop-Kennung)' : ''),
      'info',
    );
    set(
      'system',
      'umgebung',
      'System-Version',
      device.osVersion ?? 'unbekannt',
      major === null ? 'info' : major >= MIN_IOS ? 'ok' : 'fehlt',
    );
    set('safari', 'umgebung', 'Safari-Version', device.safariVersion ?? 'unbekannt', 'info');
    const standalone = isStandalone(nav, (q) => window.matchMedia(q));
    set(
      'standalone',
      'umgebung',
      'Vom Home-Bildschirm geöffnet',
      yesNo(standalone),
      standalone ? 'ok' : 'hinweis',
    );
    set(
      'viewport',
      'umgebung',
      'Sichtbare Fläche',
      `${window.innerWidth} × ${window.innerHeight} pt`,
      'info',
    );
    set(
      'screen',
      'umgebung',
      'Bildschirm',
      `${screen.width} × ${screen.height} pt, ${window.devicePixelRatio}x`,
      'info',
    );
    const insets = readSafeAreaInsets(document);
    set(
      'safearea',
      'umgebung',
      'Safe Area (oben, rechts, unten, links)',
      `${insets.top}, ${insets.right}, ${insets.bottom}, ${insets.left} px`,
      'info',
    );
    set(
      'motion',
      'umgebung',
      'Bewegung reduzieren',
      yesNo(window.matchMedia('(prefers-reduced-motion: reduce)').matches),
      'info',
    );
    set(
      'zeitzone',
      'umgebung',
      'Zeitzone',
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      'info',
    );

    const storage = await readStorageStatus(nav.storage);
    set(
      'persisted',
      'speicher',
      'Dauerhafter Speicher (persisted)',
      storage.persisted === null ? 'unbekannt' : yesNo(storage.persisted),
      storage.persisted ? 'ok' : 'hinweis',
    );
    set(
      'quota',
      'speicher',
      'Belegt / verfügbar',
      storage.usage !== null && storage.quota !== null
        ? `${formatBytes(storage.usage)} / ${formatBytes(storage.quota)}`
        : 'unbekannt',
      storage.quota !== null ? 'info' : 'hinweis',
    );

    const now = new Date();
    for (const variant of SHARE_VARIANTS) {
      const ok = canShareFiles(nav, [variant.make(now)]);
      set(
        `canshare-${variant.id}`,
        'teilen',
        `canShare ${variant.label}`,
        yesNo(ok),
        ok ? 'ok' : 'fehlt',
      );
    }

    const apis: [string, string, boolean][] = [
      ['sw', 'Service Worker', 'serviceWorker' in nav],
      ['swcontrol', 'Seite vom Service Worker gesteuert', Boolean(nav.serviceWorker?.controller)],
      ['badge', 'App-Badge (setAppBadge)', typeof nav.setAppBadge === 'function'],
      ['notification', 'Mitteilungen', typeof Notification !== 'undefined'],
      ['opfs', 'Origin Private File System', typeof nav.storage?.getDirectory === 'function'],
      ['compression', 'CompressionStream', typeof CompressionStream !== 'undefined'],
      ['offscreen', 'OffscreenCanvas', typeof OffscreenCanvas !== 'undefined'],
      ['uuid', 'crypto.randomUUID', typeof crypto.randomUUID === 'function'],
      ['clipboard', 'Zwischenablage', typeof nav.clipboard?.writeText === 'function'],
    ];
    for (const [id, label, available] of apis) {
      set(
        `api-${id}`,
        'apis',
        label,
        available ? 'vorhanden' : 'fehlt',
        available ? 'ok' : 'hinweis',
      );
    }
    if (typeof Notification !== 'undefined') {
      set(
        'api-notification-permission',
        'apis',
        'Mitteilungs-Erlaubnis',
        Notification.permission,
        'info',
      );
    }

    try {
      const db = await openProbeDb(probeDb);
      const marker = await getValue(db, MARKER_KEY);
      db.close();
      set(
        'marker',
        'marker',
        'Marker',
        typeof marker === 'string'
          ? `vorhanden, gesetzt ${new Date(marker).toLocaleString('de-DE')}`
          : 'kein Marker',
        typeof marker === 'string' ? 'ok' : 'info',
      );
    } catch (error) {
      set('marker', 'marker', 'Marker', errorText(error), 'fehlt');
    }
  }, [probeDb, set]);

  useEffect(() => {
    void runAutomatic();
  }, [runAutomatic]);

  const actions = useMemo(
    () => ({
      async requestPersist() {
        const granted = await requestPersistentStorage(navigator.storage);
        set(
          'persist-request',
          'speicher',
          'persist() angefordert',
          granted === null ? 'nicht verfügbar' : yesNo(granted),
          granted ? 'ok' : 'hinweis',
        );
        await runAutomatic();
      },

      async runBlobTest() {
        set('blob', 'datenbank', '50-MB-Datei schreiben und lesen', 'läuft …', 'läuft');
        try {
          const r = await blobRoundtrip(probeDb, BLOB_BYTES);
          set(
            'blob',
            'datenbank',
            '50-MB-Datei schreiben und lesen',
            `${r.intact ? 'intakt' : 'BESCHÄDIGT'}, schreiben ${ms(r.writeMs)}, lesen ${ms(r.readMs)}`,
            r.intact ? 'ok' : 'fehlt',
          );
        } catch (error) {
          set('blob', 'datenbank', '50-MB-Datei schreiben und lesen', errorText(error), 'fehlt');
        }
      },

      async setMarker() {
        const db = await openProbeDb(probeDb);
        await putValue(db, MARKER_KEY, new Date().toISOString());
        db.close();
        await runAutomatic();
      },

      async clearMarker() {
        const db = await openProbeDb(probeDb);
        await deleteValue(db, MARKER_KEY);
        db.close();
        await runAutomatic();
      },

      async share(variantId: string) {
        const variant = SHARE_VARIANTS.find((v) => v.id === variantId);
        if (!variant) return;
        const outcome = await shareFiles(navigator, [variant.make(new Date())]);
        set(
          `share-${variant.id}`,
          'teilen',
          `Teilen ${variant.label}`,
          outcome,
          outcome === 'geteilt' ? 'ok' : outcome === 'abgebrochen' ? 'info' : 'fehlt',
        );
      },

      async inspectFile(file: File, withFilter: boolean) {
        const info = inspectBytes(file.name, file.type, new Uint8Array(await file.arrayBuffer()));
        const id = withFilter ? 'datei-filter' : 'datei-ohne';
        const label = withFilter ? 'Gewählt mit Filter .juri' : 'Gewählt ohne Filter';
        const value = `${info.name}, Typ „${info.type || 'leer'}“, ${formatBytes(info.size)}, ${
          info.checkFileFound
            ? 'Testdatei erkannt'
            : info.isZip
              ? 'ZIP, aber keine Testdatei'
              : `kein ZIP (${info.signature})`
        }`;
        set(id, 'dateien', label, value, info.checkFileFound ? 'ok' : 'hinweis');
      },

      async inspectImage(file: File) {
        set(
          'bild-typ',
          'bilder',
          'Übergebene Datei',
          `${file.name}, Typ „${file.type || 'leer'}“, ${formatBytes(file.size)}`,
          'info',
        );
        try {
          const decoded = await decodeImage(file);
          set(
            'bild-dekodiert',
            'bilder',
            'Dekodiert',
            `${decoded.width} × ${decoded.height} px in ${ms(decoded.ms)}`,
            'ok',
          );
          for (const type of ['image/jpeg', 'image/webp'] as const) {
            const enc = await encodeImage(decoded.bitmap, type, 0.85, 2000);
            const works = enc.actualType === type;
            set(
              `bild-${type}`,
              'bilder',
              `Neu kodiert als ${type}`,
              `${works ? 'ja' : `nein, geliefert: ${enc.actualType || 'leer'}`}, ${enc.width} × ${enc.height}, ${formatBytes(enc.bytes)}`,
              works ? 'ok' : type === 'image/webp' ? 'hinweis' : 'fehlt',
            );
          }
          decoded.bitmap.close();
        } catch (error) {
          set('bild-dekodiert', 'bilder', 'Dekodiert', errorText(error), 'fehlt');
        }
      },

      icsDownload() {
        downloadFile(document, icsFile(new Date()));
        set('ics-download', 'kalender', 'Termin als Datei geöffnet', 'ausgelöst', 'info');
      },

      async icsShare() {
        const outcome = await shareFiles(navigator, [icsFile(new Date())]);
        set(
          'ics-share',
          'kalender',
          'Termin über Teilen-Menü',
          outcome,
          outcome === 'geteilt' ? 'ok' : 'info',
        );
      },

      toggleSurface() {
        const next = !surfaceOn;
        setSurfaceColor(document, next ? '#F6F4FB' : null);
        setSurfaceOn(next);
      },

      setAnswer(id: string, answer: Answer) {
        setAnswers((prev) => ({ ...prev, [id]: answer }));
      },
    }),
    [probeDb, runAutomatic, set, surfaceOn],
  );

  useEffect(() => () => setSurfaceColor(document, null), []);

  const report = useMemo(
    () =>
      buildReport({
        generatedAt: new Date(),
        instance: instance.id,
        build: buildLabel(BUILD),
        results,
        resultSections: Object.fromEntries(
          Object.entries(results).map(([id, r]) => [id, r.section]),
        ),
        answers,
      }),
    [answers, instance.id, results],
  );

  const exportActions = useMemo(
    () => ({
      copy: () => copyText(navigator, report),
      share: () =>
        shareFiles(navigator, [
          new File([report], 'Juri-Geraetecheck.txt', { type: 'text/plain' }),
        ]),
    }),
    [report],
  );

  return { results, answers, surfaceOn, report, actions, exportActions };
}
