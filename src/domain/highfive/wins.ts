/**
 * Erfolge eines Kontakts, für die man ein High five geben kann (HighFive.dc.html: „12 Tage in
 * Folge“, „200 Karten angelegt“). Sie folgen aus dem Erfolgs-Snapshot, den der Kontakt mitgeschickt
 * hat (A9), und sind nur Anzeige: Der Snapshot ist nicht authentifiziert (A69). Rein und ohne Uhr.
 */
import { MILESTONES } from '../progress/milestones';
import type { Achievements } from '../model/records';
import { groupDigits } from '../today/today';

export interface Win {
  /** Schlüssel für „schon gefeiert“, z. B. `streak:12`, `created:200`, `m:teamplayer`. */
  readonly key: string;
  /** Anlass ohne Namen: „12 Tage in Folge“. */
  readonly text: string;
  /** Satz nach dem Namen: „hat 12 Tage in Folge geschafft“. */
  readonly sentence: string;
}

/** Ab wie vielen Tagen in Folge die Serie eines Kontakts zählt. */
export const STREAK_MIN = 3;
/** Wiederholungen und Karten werden in Stufen gefeiert (1.000, 2.000 … und 100, 200 …). */
export const REVIEW_STEP = 1000;
export const CREATED_STEP = 100;

const milestoneKey = (id: string) => `m:${id}`;

function milestoneWins(achievements: Achievements): Win[] {
  const unlocked = new Set(achievements.milestones);
  return MILESTONES.filter((def) => unlocked.has(def.id)).map((def) => ({
    key: milestoneKey(def.id),
    text: `Meilenstein „${def.name}“`,
    sentence: `hat den Meilenstein „${def.name}“ erreicht`,
  }));
}

/** Alle Anlässe eines Snapshots in der Reihenfolge ihres Vorrangs (Meilenstein, Wiederholungen, Karten, Serie). */
export function winsOf(achievements: Achievements): Win[] {
  const wins = milestoneWins(achievements).reverse();
  const reviews = Math.floor(achievements.reviews / REVIEW_STEP) * REVIEW_STEP;
  if (reviews >= REVIEW_STEP) {
    const text = `${groupDigits(reviews)} Wiederholungen`;
    wins.push({ key: `reviews:${String(reviews)}`, text, sentence: `hat ${text} geschafft` });
  }
  const created = Math.floor(achievements.created / CREATED_STEP) * CREATED_STEP;
  if (created >= CREATED_STEP) {
    const text = `${groupDigits(created)} Karten angelegt`;
    wins.push({ key: `created:${String(created)}`, text, sentence: `hat ${text}` });
  }
  if (achievements.streak >= STREAK_MIN) {
    const text = `${groupDigits(achievements.streak)} Tage in Folge`;
    wins.push({
      key: `streak:${String(achievements.streak)}`,
      text,
      sentence: `hat ${text} geschafft`,
    });
  }
  return wins;
}

/** Der erste Anlass, den es noch zu feiern gibt; `null`, wenn nichts Neues da ist. */
export function nextWin(
  achievements: Achievements | undefined,
  celebrated: readonly string[],
): Win | null {
  if (!achievements) return null;
  const done = new Set(celebrated);
  return winsOf(achievements).find((win) => !done.has(win.key)) ?? null;
}

/**
 * Beim ersten Kennenlernen zählen schon erreichte Meilensteine als gefeiert: Wer neu dazukommt,
 * soll nicht mit „Erste Karte“ eines Profis begrüßt werden. Zahlen und Serie bleiben offen.
 */
export function seedCelebrated(achievements: Achievements | undefined): string[] {
  return achievements ? achievements.milestones.map(milestoneKey) : [];
}
