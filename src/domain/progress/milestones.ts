/**
 * Meilensteine (Erfolge.dc.html), deklarativ: Jeder hat eine Kennzahl und ein Ziel. Freigeschaltet
 * wird genau einmal; ob ein Meilenstein schon freigeschaltet ist, steht in der Tabelle
 * `milestones` (ADR-013), nicht in der Kennzahl. Eine später sinkende Kennzahl (Serie) nimmt
 * nichts zurück.
 */
import { groupDigits } from '../today/today';

export type MilestoneIcon = 'pen' | 'stack' | 'tree' | 'cal' | 'rep' | 'share';
export type MetricKey = 'created' | 'reviews' | 'schemas' | 'streak';

export interface MilestoneDef {
  readonly id: string;
  readonly name: string;
  readonly icon: MilestoneIcon;
  readonly metric: MetricKey;
  readonly target: number;
  /** Satz für die Feier. */
  readonly text: string;
}

/** Kennzahlen, aus denen die Freischaltung folgt. */
export type Metrics = Readonly<Record<MetricKey, number>>;

/**
 * Reihenfolge wie in Erfolge.dc.html. „Teamplayer“ (geteilt) kommt mit dem Teilen in M10 und M11;
 * bis dahin gibt es keine Kennzahl dafür, und „30 Tage am Stück“ steht an seiner Stelle.
 */
export const MILESTONES: readonly MilestoneDef[] = [
  {
    id: 'erste-karte',
    name: 'Erste Karte',
    icon: 'pen',
    metric: 'created',
    target: 1,
    text: 'Deine erste Karte ist angelegt. Der Anfang ist gemacht.',
  },
  {
    id: 'angelegt-100',
    name: '100 angelegt',
    icon: 'stack',
    metric: 'created',
    target: 100,
    text: '100 Karten angelegt. Das ist ein solides Fundament.',
  },
  {
    id: 'schema-baumeister',
    name: 'Schema-Baumeister',
    icon: 'tree',
    metric: 'schemas',
    target: 10,
    text: '10 Schemata gebaut. Struktur ist die halbe Miete.',
  },
  {
    id: 'serie-7',
    name: '7 Tage am Stück',
    icon: 'cal',
    metric: 'streak',
    target: 7,
    text: '7 Tage in Folge dein Tagesziel erreicht.',
  },
  {
    id: 'wiederholungen-1000',
    name: '1.000 Wiederholungen',
    icon: 'rep',
    metric: 'reviews',
    target: 1000,
    text: '1.000 Wiederholungen. Das Wissen sitzt.',
  },
  {
    id: 'serie-30',
    name: '30 Tage am Stück',
    icon: 'cal',
    metric: 'streak',
    target: 30,
    text: '30 Tage in Folge. Das ist eine Gewohnheit.',
  },
];

export const NO_METRICS: Metrics = { created: 0, reviews: 0, schemas: 0, streak: 0 };

/** Die Meilensteine, die bei diesen Kennzahlen erreicht sind und noch nicht freigeschaltet wurden. */
export function newlyReached(
  metrics: Metrics,
  unlocked: ReadonlySet<string>,
  defs: readonly MilestoneDef[] = MILESTONES,
): MilestoneDef[] {
  return defs.filter((def) => !unlocked.has(def.id) && metrics[def.metric] >= def.target);
}

/** Freigeschalteter Meilenstein: wann, und ob die Feier schon gezeigt wurde. */
export interface Unlock {
  readonly unlockedAt: number;
  readonly seen: boolean;
}

export interface Badge {
  readonly id: string;
  readonly name: string;
  readonly text: string;
  readonly icon: MilestoneIcon;
  /** „geschafft“ oder „7 von 10“. */
  readonly sub: string;
  /** Anteil 0 bis 1 für den Ring. */
  readonly fraction: number;
  readonly done: boolean;
  /** Frisch freigeschaltet und noch nicht gefeiert: leuchtet. */
  readonly fresh: boolean;
}

export function badges(
  metrics: Metrics,
  unlocked: ReadonlyMap<string, Unlock>,
  defs: readonly MilestoneDef[] = MILESTONES,
): Badge[] {
  return defs.map((def) => {
    const unlock = unlocked.get(def.id);
    const value = metrics[def.metric];
    const done = unlock !== undefined || value >= def.target;
    return {
      id: def.id,
      name: def.name,
      text: def.text,
      icon: def.icon,
      sub: done ? 'geschafft' : `${groupDigits(value)} von ${groupDigits(def.target)}`,
      fraction: done ? 1 : Math.max(0, Math.min(1, value / def.target)),
      done,
      fresh: unlock !== undefined && !unlock.seen,
    };
  });
}
