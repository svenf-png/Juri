/**
 * Schema-Karten (M5, ADR-009): eine Gliederung aus Punkten mit Text, Norm, Inhalt und einer
 * optionalen Verknüpfung zu einer anderen Karte. Reine Funktionen für den Editor (Einrücken,
 * Verschieben), die Prüfung und die Verknüpfungen zwischen Karten.
 *
 * Die Punkte stehen flach in Lesereihenfolge, jeder mit seiner Ebene (1 bis 3). Zusammen mit der
 * Regel „höchstens eine Ebene tiefer als der Punkt davor“ ergibt das die Baumstruktur, ohne
 * Verweise zwischen Punkten. Die Zählung („1.“, „a)“, „aa)“) ist abgeleitet, nicht gespeichert.
 */
import { SCHEMA_MAX_LEVEL, SCHEMA_MAX_POINTS, type Card, type SchemaPoint } from '../model/records';

export const SCHEMA_TITLE_MAX = 200;
export const POINT_TEXT_MAX = 200;
export const POINT_NORM_MAX = 200;
export const POINT_CONTENT_MAX = 2000;

/** Punkt im Editor: alle Felder als Text, `link` ist `null` ohne Verknüpfung. */
export interface DraftPoint {
  readonly id: string;
  readonly level: number;
  readonly text: string;
  readonly norm: string;
  readonly content: string;
  readonly link: string | null;
}

export function pointsToDraft(points: readonly SchemaPoint[]): DraftPoint[] {
  return points.map((p) => ({
    id: p.id,
    level: p.level,
    text: p.text,
    norm: p.norm ?? '',
    content: p.content ?? '',
    link: p.link ?? null,
  }));
}

/** Nächste freie Kennung `p<N>` (größte plus eins, damit gelöschte nicht wiederkehren). */
export function newPointId(points: readonly { readonly id: string }[]): string {
  const highest = points.reduce((max, p) => Math.max(max, Number(p.id.slice(1))), 0);
  return `p${String(highest + 1)}`;
}

export function emptyPoint(id: string, level = 1): DraftPoint {
  return { id, level, text: '', norm: '', content: '', link: null };
}

/** Ende (ausschließlich) des Teilbaums ab `index`: der Punkt und alle tieferen direkt danach. */
export function subtreeEnd(points: readonly { readonly level: number }[], index: number): number {
  const level = points[index]?.level ?? 0;
  let end = index + 1;
  while (end < points.length && (points[end]?.level ?? 0) > level) end++;
  return end;
}

/** Stellt die Regel „erster Punkt auf Ebene 1, sonst höchstens eine Ebene tiefer als davor“ her. */
export function fixLevels<T extends { readonly level: number }>(points: readonly T[]): T[] {
  const out: T[] = [];
  for (const p of points) {
    const max = out.length === 0 ? 1 : (out[out.length - 1]?.level ?? 0) + 1;
    const level = Math.max(1, Math.min(p.level, max, SCHEMA_MAX_LEVEL));
    out.push(level === p.level ? p : { ...p, level });
  }
  return out;
}

export function canAddPoint(points: readonly unknown[]): boolean {
  return points.length < SCHEMA_MAX_POINTS;
}

/**
 * Neuer leerer Punkt hinter dem gewählten (und dessen Teilbaum), auf derselben Ebene. Ohne Auswahl
 * ans Ende auf der Ebene des letzten Punkts. `index` ist die Stelle des neuen Punkts.
 */
export function addPoint(
  points: readonly DraftPoint[],
  after: number | null,
): { points: DraftPoint[]; index: number } {
  if (!canAddPoint(points)) return { points: [...points], index: after ?? points.length - 1 };
  const anchor = after ?? points.length - 1;
  const at = anchor < 0 ? 0 : subtreeEnd(points, anchor);
  const level = anchor < 0 ? 1 : (points[anchor]?.level ?? 1);
  const next = [...points];
  next.splice(at, 0, emptyPoint(newPointId(points), level));
  return { points: next, index: at };
}

export function updatePoint(
  points: readonly DraftPoint[],
  index: number,
  patch: Partial<Omit<DraftPoint, 'id'>>,
): DraftPoint[] {
  return points.map((p, i) => (i === index ? { ...p, ...patch } : p));
}

/** Der Punkt (mit seinem Teilbaum) darf eine Ebene tiefer, wenn der Punkt davor mindestens so tief liegt. */
export function canIndent(points: readonly DraftPoint[], index: number): boolean {
  const point = points[index];
  const before = points[index - 1];
  if (!point || !before || point.level > before.level) return false;
  const end = subtreeEnd(points, index);
  return points.slice(index, end).every((p) => p.level < SCHEMA_MAX_LEVEL);
}

export function canOutdent(points: readonly DraftPoint[], index: number): boolean {
  return (points[index]?.level ?? 1) > 1;
}

function shiftSubtree(points: readonly DraftPoint[], index: number, by: number): DraftPoint[] {
  const end = subtreeEnd(points, index);
  return points.map((p, i) => (i >= index && i < end ? { ...p, level: p.level + by } : p));
}

/** Einrücken: der Teilbaum wandert eine Ebene tiefer. Ohne Möglichkeit bleibt alles, wie es ist. */
export function indentPoint(points: readonly DraftPoint[], index: number): DraftPoint[] {
  return canIndent(points, index) ? shiftSubtree(points, index, 1) : [...points];
}

/** Ausrücken: der Teilbaum wandert eine Ebene höher; nachfolgende Geschwister werden seine Kinder. */
export function outdentPoint(points: readonly DraftPoint[], index: number): DraftPoint[] {
  return canOutdent(points, index) ? fixLevels(shiftSubtree(points, index, -1)) : [...points];
}

/** Entfernt nur diesen Punkt; seine Unterpunkte rücken nach, soweit die Ebenen es erlauben. */
export function removePoint(points: readonly DraftPoint[], index: number): DraftPoint[] {
  return fixLevels(points.filter((_, i) => i !== index));
}

/** Anfang des vorherigen Geschwisters (gleiche Ebene, gleicher Oberpunkt) oder -1. */
function previousSibling(points: readonly DraftPoint[], index: number): number {
  const level = points[index]?.level ?? 0;
  for (let k = index - 1; k >= 0; k--) {
    const l = points[k]?.level ?? 0;
    if (l < level) return -1;
    if (l === level) return k;
  }
  return -1;
}

export function canMove(points: readonly DraftPoint[], index: number, dir: -1 | 1): boolean {
  if (dir === -1) return previousSibling(points, index) >= 0;
  const next = subtreeEnd(points, index);
  return next < points.length && points[next]?.level === points[index]?.level;
}

/** Verschiebt den Teilbaum hinter oder vor das benachbarte Geschwister; liefert auch die neue Stelle. */
export function movePoint(
  points: readonly DraftPoint[],
  index: number,
  dir: -1 | 1,
): { points: DraftPoint[]; index: number } {
  if (!canMove(points, index, dir)) return { points: [...points], index };
  if (dir === -1) {
    const start = previousSibling(points, index);
    const end = subtreeEnd(points, index);
    return {
      points: [
        ...points.slice(0, start),
        ...points.slice(index, end),
        ...points.slice(start, index),
        ...points.slice(end),
      ],
      index: start,
    };
  }
  const nextStart = subtreeEnd(points, index);
  const nextEnd = subtreeEnd(points, nextStart);
  return {
    points: [
      ...points.slice(0, index),
      ...points.slice(nextStart, nextEnd),
      ...points.slice(index, nextStart),
      ...points.slice(nextEnd),
    ],
    index: index + (nextEnd - nextStart),
  };
}

/** Buchstaben a bis z, danach aa, ab … (1 → „a“). */
function letters(n: number): string {
  let out = '';
  for (let k = n; k > 0; k = Math.floor((k - 1) / 26)) {
    out = String.fromCharCode(97 + ((k - 1) % 26)) + out;
  }
  return out;
}

/**
 * Zählung der Punkte: Ebene 1 „1“, „2“ …, Ebene 2 „a“, „b“ …, Ebene 3 „aa“, „bb“ … (ohne Punkt und
 * Klammer; die Ansicht ergänzt „1.“ und „a)“). Jede Ebene zählt neu unter ihrem Oberpunkt.
 */
export function pointNumbers(points: readonly { readonly level: number }[]): string[] {
  const counters = [0, 0, 0, 0];
  return points.map((p) => {
    const level = Math.max(1, Math.min(p.level, SCHEMA_MAX_LEVEL));
    counters[level] = (counters[level] ?? 0) + 1;
    for (let deeper = level + 1; deeper <= SCHEMA_MAX_LEVEL; deeper++) counters[deeper] = 0;
    const n = counters[level] ?? 1;
    if (level === 1) return String(n);
    const l = letters(n);
    return level === 2 ? l : l + l;
  });
}

/**
 * Pfad eines Punkts von der obersten Ebene an: „2“, „2.b“, „2.b.aa“ (Kopf des Punkt-Sheets und
 * Ansage für Screenreader).
 */
export function pointPaths(points: readonly { readonly level: number }[]): string[] {
  const numbers = pointNumbers(points);
  const trail: string[] = [];
  return points.map((p, i) => {
    trail.length = Math.max(0, Math.min(p.level, SCHEMA_MAX_LEVEL) - 1);
    trail.push(numbers[i] ?? '');
    return trail.join('.');
  });
}

/** Zählung mit Satzzeichen für den Editor: „1.“, „a)“, „aa)“. */
export function pointLabels(points: readonly { readonly level: number }[]): string[] {
  return pointNumbers(points).map((n, i) => (points[i]?.level === 1 ? `${n}.` : `${n})`));
}

export interface SchemaForm {
  readonly title: string;
  readonly points: readonly DraftPoint[];
}

export type SchemaErrors = Partial<Record<'title' | 'points', string>> & {
  /** Fehler je Punkt (Kennung des Punkts). */
  readonly point?: Readonly<Record<string, string>>;
};

export interface SchemaFields {
  readonly title: string;
  readonly points: SchemaPoint[];
}

function tidy(input: string, max: number): string {
  return input.replace(/\s+/gu, ' ').trim().slice(0, max).trim();
}

function tooLong(what: string, max: number): string {
  return `${what} ist zu lang (höchstens ${max.toLocaleString('de-DE')} Zeichen).`;
}

/**
 * Prüft Titel und Gliederung. Ganz leere Punkte fallen weg (der Editor legt sie beim Antippen von
 * „+“ an); ein Punkt mit Norm, Inhalt oder Verknüpfung, aber ohne Text ist ein Fehler.
 */
export function checkSchema(
  form: SchemaForm,
): { ok: true; fields: SchemaFields } | { ok: false; errors: SchemaErrors } {
  const errors: { title?: string; points?: string; point?: Record<string, string> } = {};
  const title = tidy(form.title, Infinity);
  if (title === '') errors.title = 'Der Titel fehlt.';
  else if (title.length > SCHEMA_TITLE_MAX) errors.title = tooLong('Der Titel', SCHEMA_TITLE_MAX);

  const point: Record<string, string> = {};
  const kept: SchemaPoint[] = [];
  for (const p of form.points) {
    const text = tidy(p.text, Infinity);
    const norm = tidy(p.norm, Infinity);
    const content = p.content.trim();
    if (text === '' && norm === '' && content === '' && p.link === null) continue;
    if (text === '') point[p.id] = 'Der Punkt braucht einen Text.';
    else if (text.length > POINT_TEXT_MAX) point[p.id] = tooLong('Der Text', POINT_TEXT_MAX);
    else if (norm.length > POINT_NORM_MAX) point[p.id] = tooLong('Die Norm', POINT_NORM_MAX);
    else if (content.length > POINT_CONTENT_MAX) {
      point[p.id] = tooLong('Der Inhalt', POINT_CONTENT_MAX);
    }
    kept.push({
      id: p.id,
      level: p.level,
      text,
      ...(norm === '' ? {} : { norm }),
      ...(content === '' ? {} : { content }),
      ...(p.link === null ? {} : { link: p.link }),
    });
  }
  if (kept.length === 0) errors.points = 'Ein Schema braucht mindestens einen Punkt.';
  if (Object.keys(point).length > 0) errors.point = point;
  if (errors.title || errors.points || errors.point) return { ok: false, errors };
  return { ok: true, fields: { title, points: fixLevels(kept) } };
}

/** Kennungen aller Karten, auf die Punkte dieser Schema-Karte verweisen (ohne Doppelte). */
export function linkedCardIds(card: Card): string[] {
  if (card.type !== 'schema') return [];
  return [...new Set(card.points.flatMap((p) => (p.link === undefined ? [] : [p.link])))];
}

export interface SchemaLinkUse {
  readonly card: Card & { readonly type: 'schema' };
  /** Wie viele Punkte dort auf die betroffenen Karten zeigen. */
  readonly points: number;
}

/**
 * Schema-Karten, die auf eine der `targets` verweisen; `except` sind Karten, die selbst mit
 * gelöscht werden (ihre Verknüpfungen verschwinden ohnehin).
 */
export function linksTo(
  cards: readonly Card[],
  targets: ReadonlySet<string>,
  except: ReadonlySet<string> = new Set(),
): SchemaLinkUse[] {
  const uses: SchemaLinkUse[] = [];
  for (const card of cards) {
    if (card.type !== 'schema' || except.has(card.id)) continue;
    const points = card.points.filter((p) => p.link !== undefined && targets.has(p.link)).length;
    if (points > 0) uses.push({ card, points });
  }
  return uses;
}

/** Schema ohne die Verknüpfungen zu `targets`; `null`, wenn es keine solchen gab. */
export function withoutLinks(
  card: Card & { readonly type: 'schema' },
  targets: ReadonlySet<string>,
): (Card & { readonly type: 'schema' }) | null {
  if (!card.points.some((p) => p.link !== undefined && targets.has(p.link))) return null;
  return {
    ...card,
    points: card.points.map((p) => {
      if (p.link === undefined || !targets.has(p.link)) return p;
      return {
        id: p.id,
        level: p.level,
        text: p.text,
        ...(p.norm === undefined ? {} : { norm: p.norm }),
        ...(p.content === undefined ? {} : { content: p.content }),
      };
    }),
  };
}

/** Anzeige der Verknüpfungen beim Löschen: Überschrift und je Schema eine Zeile („1 Punkt“). */
export function describeLinkUse(uses: readonly SchemaLinkUse[]): {
  heading: string;
  rows: [string, string][];
} {
  const { schemas } = linkTotals(uses);
  return {
    heading: `Verknüpft in ${String(schemas)} ${schemas === 1 ? 'Schema' : 'Schemas'}`,
    rows: uses.map((u) => [
      u.card.title,
      `${String(u.points)} ${u.points === 1 ? 'Punkt' : 'Punkte'}`,
    ]),
  };
}

/** Wie viele Verknüpfungen in einer Liste von Nutzungen entfallen, für „3 Verknüpfungen in 2 Schemas“. */
export function linkTotals(uses: readonly SchemaLinkUse[]): { links: number; schemas: number } {
  return { links: uses.reduce((sum, u) => sum + u.points, 0), schemas: uses.length };
}
