/**
 * Stufen der Heatmap (System.dc.html „Heatmap-Stufen“): 0 = nichts, 1 bis 4 nach Quantilen der
 * Tage mit Aktivität. Grundlage ist der gesamte Verlauf, damit Heute, Erfolge und die Feier
 * dieselbe Stufe für denselben Tag zeigen.
 */
export type Level = 0 | 1 | 2 | 3 | 4;

/** Quantil mit linearer Interpolation (Typ 7 wie in R und NumPy); `sorted` aufsteigend, nicht leer. */
export function quantile(sorted: readonly number[], p: number): number {
  const first = sorted[0] ?? 0;
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  const a = sorted[lo] ?? first;
  const b = sorted[lo + 1] ?? a;
  return a + (h - lo) * (b - a);
}

export type Thresholds = readonly [number, number, number];

/** Schwellen für Stufe 2, 3 und 4 aus den Werten der Tage mit Aktivität (Werte über 0). */
export function thresholds(values: Iterable<number>): Thresholds {
  const sorted = [...values].filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return [Infinity, Infinity, Infinity];
  return [quantile(sorted, 0.25), quantile(sorted, 0.5), quantile(sorted, 0.75)];
}

/**
 * Stufe eines Werts. Ein Tag erreicht eine Stufe, sobald er die Schwelle erreicht (Gleichstand
 * zählt nach oben): Ein einziger Tag oder lauter gleiche Tage sind damit Stufe 4, nicht Stufe 1.
 */
export function levelOf(value: number, t: Thresholds): Level {
  if (value <= 0) return 0;
  return (1 + (value >= t[0] ? 1 : 0) + (value >= t[1] ? 1 : 0) + (value >= t[2] ? 1 : 0)) as Level;
}

/** Rekordtag: der Tag mit dem größten Wert; bei Gleichstand der früheste (er hat den Rekord aufgestellt). */
export function recordOf(
  values: ReadonlyMap<string, number>,
): { readonly day: string; readonly value: number } | null {
  let best: { day: string; value: number } | null = null;
  for (const [day, value] of values) {
    if (value <= 0) continue;
    if (!best || value > best.value || (value === best.value && day < best.day)) {
      best = { day, value };
    }
  }
  return best;
}
