import { addDays, dayKey, parseDayKey } from '@/domain/calendar/day';
import type { FertigModel } from '@/domain/progress/celebrate';
import type { ErfolgeModel, HeatView } from '@/domain/progress/erfolge';
import { streakNotes } from '@/domain/progress/erfolge';
import { DEFAULT_GOALS } from '@/domain/progress/goals';
import { heatmap } from '@/domain/progress/heatmap';
import type { Level } from '@/domain/progress/levels';
import type { Badge } from '@/domain/progress/milestones';
import { lastWeek } from '@/domain/today/today';
import type { Mode } from '@/domain/progress/summary';

/**
 * Feste Beispieldaten aus Erfolge.dc.html und iPadErfolge.dc.html für die Design-Vorschau
 * (/styleguide/erfolge/…), den Bildvergleich und die Bilder in docs/bilder/. Die Stufen je Zelle
 * kommen aus derselben Zufallsfolge wie im Design; nichts davon wird gespeichert (A11).
 */
const TODAY = parseDayKey('2026-09-28'); // Montag
const LEARN_RECORD = 'Rekord: Mi, 23.9. · 86 Wiederholungen';
const MAKE_RECORD = 'Rekord: Sa, 12.9. · 31 Karten angelegt';

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Stufen je Zelle, spaltenweise, wie `levels()` in Erfolge.dc.html (12 Wochen). */
function phoneLevels(mode: Mode): number[] {
  const rnd = lcg(mode === 'learn' ? 7 : 19);
  const out: number[] = [];
  for (let i = 0; i < 12 * 7; i++) {
    const r = rnd();
    out.push(
      mode === 'learn'
        ? r < 0.12
          ? 0
          : r < 0.35
            ? 1
            : r < 0.65
              ? 2
              : r < 0.9
                ? 3
                : 4
        : r < 0.45
          ? 0
          : r < 0.72
            ? 1
            : r < 0.88
              ? 2
              : r < 0.96
                ? 3
                : 4,
    );
  }
  if (mode === 'learn') {
    const lastWeekLevels = [3, 4, 0, 2, 3, 1];
    for (let d = 1; d < 7; d++) out[10 * 7 + d] = lastWeekLevels[d - 1] ?? 0;
    out[10 * 7] = 3;
    for (let i = 0; i < out.length; i++) if (out[i] === 4 && i !== 10 * 7 + 2) out[i] = 3;
    out[10 * 7 + 2] = 4;
  } else {
    for (let i = 0; i < out.length; i++) if (out[i] === 4 && i !== 8 * 7 + 5) out[i] = 3;
    out[8 * 7 + 5] = 4;
  }
  out[11 * 7] = 2;
  return out;
}

/** Stufen je Zelle für 26 Wochen, wie renderVals() in iPadErfolge.dc.html. */
function wideLevels(mode: Mode): { levels: number[]; record: number } {
  const rnd = lcg(mode === 'learn' ? 11 : 23);
  const W = 26;
  const lv: number[] = [];
  for (let i = 0; i < W * 7; i++) {
    const r = rnd();
    lv.push(
      mode === 'learn'
        ? r < 0.12
          ? 0
          : r < 0.35
            ? 1
            : r < 0.65
              ? 2
              : 3
        : r < 0.45
          ? 0
          : r < 0.72
            ? 1
            : r < 0.9
              ? 2
              : 3,
    );
  }
  const last = (W - 2) * 7;
  if (mode === 'learn') [3, 3, 4, 0, 2, 3, 1].forEach((v, d) => (lv[last + d] = v));
  const record = mode === 'learn' ? last + 2 : (W - 4) * 7 + 5;
  lv[record] = 4;
  lv[(W - 1) * 7] = 2;
  return { levels: lv, record };
}

function grid(weeks: 12 | 26, levels: readonly number[], record: number) {
  const start = addDays(TODAY, -((weeks - 1) * 7));
  const key = (i: number) => dayKey(addDays(start, i));
  const byKey = new Map(levels.map((level, i) => [key(i), level as Level]));
  return heatmap({
    today: TODAY,
    weeks,
    level: (k) => byKey.get(k) ?? 0,
    record: key(record),
    tip: () => '',
  });
}

function heat(mode: Mode): HeatView {
  const wide = wideLevels(mode);
  return {
    phone: grid(12, phoneLevels(mode), mode === 'learn' ? 72 : 61),
    wide: grid(26, wide.levels, wide.record),
    recordText: mode === 'learn' ? LEARN_RECORD : MAKE_RECORD,
  };
}

const badge = (
  id: string,
  name: string,
  icon: Badge['icon'],
  sub: string,
  fraction: number,
  fresh = false,
): Badge => ({ id, name, text: '', icon, sub, fraction, done: fraction >= 1, fresh });

const REPS = badge('wiederholungen-1000', '1.000 Wiederholungen', 'rep', 'geschafft', 1);

const BADGES: readonly Badge[] = [
  badge('erste-karte', 'Erste Karte', 'pen', 'geschafft', 1),
  badge('angelegt-100', '100 angelegt', 'stack', 'geschafft', 1, true),
  badge('schema-baumeister', 'Schema-Baumeister', 'tree', '7 von 10', 0.7),
  badge('serie-7', '7 Tage am Stück', 'cal', 'geschafft', 1),
  REPS,
  badge('teamplayer', 'Teamplayer', 'share', '1 von 3 geteilt', 0.33),
];

export const designModel: ErfolgeModel = {
  empty: false,
  streak: {
    days: 12,
    unit: 'Tage in Folge',
    ...streakNotes(
      { current: 12, best: 12, todayMet: true, pauseUsedThisWeek: false },
      DEFAULT_GOALS,
    ),
  },
  reviews: { value: '1.284', label: 'Wiederholungen' },
  created: { value: '146', label: 'Karten angelegt' },
  heat: { learn: heat('learn'), make: heat('make') },
  badges: BADGES,
  fresh: [],
  highFives: {
    title: '2 High fives bekommen',
    sub: 'Mara und Jonas · 2 Erfolge zum Abklatschen',
  },
};

/** Leerzustand ohne Verlauf (Artboard `ErfolgeLeer`). */
export const leerModel: ErfolgeModel = {
  ...designModel,
  empty: true,
  streak: {
    days: 0,
    unit: 'Tage in Folge',
    ...streakNotes(
      { current: 0, best: 0, todayMet: false, pauseUsedThisWeek: false },
      DEFAULT_GOALS,
    ),
  },
  reviews: { value: '0', label: 'Wiederholungen' },
  created: { value: '0', label: 'Karten angelegt' },
  badges: [
    badge('erste-karte', 'Erste Karte', 'pen', '0 von 1', 0),
    badge('angelegt-100', '100 angelegt', 'stack', '0 von 100', 0),
    badge('schema-baumeister', 'Schema-Baumeister', 'tree', '0 von 10', 0),
    badge('serie-7', '7 Tage am Stück', 'cal', '0 von 7', 0),
    badge('wiederholungen-1000', '1.000 Wiederholungen', 'rep', '0 von 1.000', 0),
    badge('serie-30', '30 Tage am Stück', 'cal', '0 von 30', 0),
  ],
  highFives: null,
};

/** Meilenstein-Feier (Artboard `ErfolgeMeilenstein`). */
export const feierBadge: Badge = {
  id: 'angelegt-100',
  name: '100 angelegt',
  text: '100 Karten angelegt. Das ist ein solides Fundament.',
  icon: 'stack',
  sub: 'geschafft',
  fraction: 1,
  done: true,
  fresh: false,
};

/** Fertig.dc.html: Di 3, Mi 4 (Rekord), Do leer, Fr 2, Sa 3, So 1, Mo 4. */
const FERTIG_LEVELS: Record<string, Level> = {
  '2026-09-22': 3,
  '2026-09-23': 4,
  '2026-09-25': 2,
  '2026-09-26': 3,
  '2026-09-27': 1,
  '2026-09-28': 4,
};

export const fertigModel: FertigModel = {
  summary: '24 von 24 Karten · 13 Tage in Folge',
  week: lastWeek(TODAY, FERTIG_LEVELS, '2026-09-23'),
  caption: 'Heute leuchtet voll: dein zweitstärkster Tag.',
  milestone: { ...REPS, fresh: true },
  moreMilestones: 0,
};
