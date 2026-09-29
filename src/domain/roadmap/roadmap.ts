/**
 * Entwicklungsstand für die Einstellungen: die Meilensteine M0 bis M13 mit der Version, in der sie
 * erscheinen (docs/ARCHITEKTUR.md, Plan). Der Stand folgt der Versionsnummer der App: Ein
 * Meilenstein gilt als fertig, sobald die App seine Version erreicht hat. Jeder Meilenstein hebt
 * die Version an (package.json), damit die Liste ohne weitere Pflege mitläuft.
 */

export interface Milestone {
  readonly id: string;
  readonly title: string;
  /** Erscheint mit dieser Version; für kommende Meilensteine vorläufig. */
  readonly version: string;
}

export const MILESTONES: readonly Milestone[] = [
  { id: 'M0', title: 'Fundament und Geräte-Check', version: '0.1.0' },
  { id: 'M1', title: 'Daten, Profil und Backup', version: '0.2.0' },
  { id: 'M2', title: 'Navigation und Heute', version: '0.3.0' },
  { id: 'M3', title: 'Karten und Stapel', version: '0.4.0' },
  { id: 'M4', title: 'Lernen mit FSRS und Leitner', version: '0.5.0' },
  { id: 'M5', title: 'Schema und Verknüpfungen', version: '0.6.0' },
  { id: 'M6', title: 'Bilder, PDF und Abdeckung', version: '0.7.0' },
  { id: 'M7', title: 'Browser-Version', version: '0.8.0' },
  { id: 'M8', title: 'Fristen', version: '0.9.0' },
  { id: 'M9', title: 'Erfolge und Serie', version: '0.10.0' },
  { id: 'M10', title: 'Teilen und Import', version: '0.11.0' },
  { id: 'M11', title: 'High fives', version: '0.12.0' },
  { id: 'M12', title: 'Feinschliff', version: '1.0.0' },
  { id: 'M13', title: 'Eigene Desktop-Gestaltung', version: '1.1.0' },
];

export type MilestoneState = 'done' | 'current' | 'planned';

export interface MilestoneRow extends Milestone {
  readonly state: MilestoneState;
}

export interface Roadmap {
  readonly rows: readonly MilestoneRow[];
  readonly done: number;
  readonly total: number;
  /** „5 von 14 Schritten fertig“ */
  readonly summary: string;
  /** Prozent der fertigen Schritte, ganzzahlig. */
  readonly percent: number;
}

/** Vergleicht „a.b.c“ numerisch; ein Zusatz wie „-beta“ zählt nicht. Ungültiges gilt als 0.0.0. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const parts = /^(\d+)\.(\d+)\.(\d+)/.exec(v)?.slice(1, 4).map(Number) ?? [0, 0, 0];
    return parts;
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Entwicklungsstand zu einer App-Version: Meilensteine bis zu dieser Version sind fertig, der
 * nächste ist „in Arbeit“, die übrigen geplant.
 */
export function roadmap(
  appVersion: string,
  milestones: readonly Milestone[] = MILESTONES,
): Roadmap {
  let currentSeen = false;
  const rows = milestones.map((m): MilestoneRow => {
    if (compareVersions(appVersion, m.version) >= 0) return { ...m, state: 'done' };
    if (!currentSeen) {
      currentSeen = true;
      return { ...m, state: 'current' };
    }
    return { ...m, state: 'planned' };
  });
  const done = rows.filter((r) => r.state === 'done').length;
  const total = rows.length;
  return {
    rows,
    done,
    total,
    summary: done === total ? 'Alle Schritte fertig' : `${done} von ${total} Schritten fertig`,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}
