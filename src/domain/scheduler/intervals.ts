/** Abstände als kurzer Text für die Bewertungsknöpfe und die Vorschau: „10 min“, „2 T“, „3 Mon“, „1,5 J“. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Text für einen Abstand in Millisekunden (Lernen.dc.html: „10 min“, „2 T“; Einstellungen.dc.html:
 * „25 T“, „4 Mon“, „1,5 J“). Unter einer Stunde in Minuten, unter 1,5 Tagen in Stunden bzw. „1 T“.
 */
export function formatInterval(ms: number): string {
  const span = Math.max(0, ms);
  if (span < HOUR) return `${Math.max(1, Math.round(span / MINUTE))} min`;
  if (span < DAY) return `${Math.round(span / HOUR)} Std`;
  const days = span / DAY;
  if (days < 1.5) return '1 T';
  if (days < 45) return `${Math.round(days)} T`;
  if (days < 365) return `${Math.round(days / 30)} Mon`;
  return `${(days / 365).toFixed(1).replace('.', ',')} J`;
}

/** Abstand in Tagen (auch gebrochen), für Beispielrechnungen. */
export function formatDays(days: number): string {
  return formatInterval(days * DAY);
}
