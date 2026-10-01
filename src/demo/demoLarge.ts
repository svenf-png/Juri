import type { BackupTables } from '@/domain/backup/codec';
import { addDays, dayStart, learningDay } from '@/domain/calendar/day';
import { buildCard, buildItems, checkCard } from '@/domain/cards/card';
import type {
  Area,
  Card,
  Deck,
  NewEvent,
  NewReviewLogEntry,
  ReviewItem,
} from '@/domain/model/records';
import { DEFAULT_GOALS } from '@/domain/progress/goals';
import { dayRows } from '@/domain/progress/rows';

/**
 * Großer Datensatz der Testinstanz (M12, Plan „Großer Datensatz“): 5.000 Karten in 50 Stapeln und
 * 8 Rechtsgebieten, davon 70 % Frage, 20 % Lückentext (zwei Lücken), 10 % Schema mit sechs Punkten,
 * dazu Lernzustände, Lernlog und Ereignisse über 13 Wochen. Inhalt ist Füllmaterial (Zahlen und
 * Muster, keine Rechtstexte), gedacht für Messungen, nicht für den Alltag. Deterministisch aus
 * `now`, damit Messungen vergleichbar bleiben.
 */

const DAY = 86_400_000;
const HOUR = 3_600_000;

export const LARGE_CARD_COUNT = 5000;
export const LARGE_DECK_COUNT = 50;
const AREAS = ['ZR', 'SR', 'ÖR', 'AR', 'HR', 'StPO', 'ZPO', 'VwGO'];
const WEEKS = 13;

function lcg(seed: number) {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

function fields(index: number, kind: 'qa' | 'cloze' | 'schema') {
  const norm = `§ ${String((index % 900) + 1)} Abs. ${String((index % 4) + 1)} Beispielgesetz`;
  const tags = `Groß Thema${String(index % 40)}`;
  const base = { norm, tags, note: '', front: '', back: '', text: '', title: '' };
  if (kind === 'qa') {
    return {
      ...base,
      type: 'qa' as const,
      front: `Frage ${String(index + 1)}: Welche Voraussetzungen hat der Anspruch aus Beispielnorm ${String(index % 900)}?`,
      back: `Antwort ${String(index + 1)}: Erstens die Rechtsgutverletzung, zweitens die Kausalität, drittens Rechtswidrigkeit und Verschulden. Rechtsfolge ist der Ersatz des Schadens nach den allgemeinen Regeln.`,
    };
  }
  if (kind === 'cloze') {
    return {
      ...base,
      type: 'cloze' as const,
      text: `Karte ${String(index + 1)}: Wer {{c1::vorsätzlich oder fahrlässig}} ein Recht {{c2::widerrechtlich}} verletzt, ist zum Ersatz des Schadens verpflichtet.`,
    };
  }
  return {
    ...base,
    type: 'schema' as const,
    title: `Schema ${String(index + 1)}`,
    points: [1, 2, 2, 1, 2, 3].map((level, pi) => ({
      id: `p${String(pi + 1)}`,
      level,
      text: `Punkt ${String(pi + 1)} des Schemas ${String(index + 1)}`,
      norm: pi % 2 === 0 ? `§ ${String(pi + 1)} Beispielgesetz` : '',
      content: pi === 0 ? 'Kurzer Inhalt zum Punkt.' : '',
      link: null,
    })),
  };
}

export interface LargeDataset {
  tables: BackupTables;
  cards: number;
  items: number;
  decks: number;
  reviews: number;
}

export function demoLargeTables(now: number, count = LARGE_CARD_COUNT): LargeDataset {
  const random = lcg(7);
  const today = learningDay(new Date(now));
  const areas: Area[] = AREAS.map((code, i) => ({
    id: `gross-area-${code}`,
    code,
    name: code,
    createdAt: now - WEEKS * 7 * DAY + i,
    updatedAt: now - WEEKS * 7 * DAY + i,
  }));
  const deckCount = Math.min(LARGE_DECK_COUNT, Math.max(1, count));
  const decks: Deck[] = Array.from({ length: deckCount }, (_, i) => ({
    id: `gross-deck-${String(i + 1).padStart(2, '0')}`,
    name: `Großer Stapel ${String(i + 1)}`,
    norm: '',
    areaIds: [
      areas[i % areas.length]?.id ?? '',
      ...(i % 5 === 0 ? [areas[(i + 3) % areas.length]?.id ?? ''] : []),
    ],
    createdAt: now - WEEKS * 7 * DAY,
    updatedAt: now - WEEKS * 7 * DAY,
  }));
  const cards: Card[] = [];
  const items: ReviewItem[] = [];
  const events: NewEvent[] = [];
  for (let i = 0; i < count; i++) {
    const deck = decks[i % deckCount];
    if (!deck) continue;
    const kind = i % 10 === 9 ? 'schema' : i % 5 === 4 ? 'cloze' : 'qa';
    const checked = checkCard(fields(i, kind));
    if (!checked.ok) throw new Error(`Ungültige Karte ${String(i)} im großen Datensatz`);
    const at = now - WEEKS * 7 * DAY + Math.floor((i / count) * (WEEKS * 7 - 1) * DAY);
    const card = buildCard(
      `gross-${String(i + 1).padStart(5, '0')}`,
      deck.id,
      checked.fields,
      at,
      at,
    );
    cards.push(card);
    items.push(...buildItems(card, at));
    events.push({ at, type: 'cardCreated', cardId: card.id, deckId: deck.id });
  }

  // Lernzustand: 70 % der Abfragen wurden gelernt, davon liegen ungefähr 6 % heute fällig.
  const log: NewReviewLogEntry[] = [];
  const learned = items.map((item) => {
    if (random() > 0.7) return item;
    const intervalDays = Math.max(1, Math.round(random() * random() * 90));
    const lastAt = now - Math.floor(random() * 60 + 1) * DAY - Math.floor(random() * 12) * HOUR;
    const lastReviewedAt = Math.max(item.createdAt, lastAt);
    const due = lastReviewedAt + intervalDays * DAY;
    const stability = intervalDays * 1.1;
    const fsrs = {
      due,
      stability,
      difficulty: 3 + random() * 6,
      scheduledDays: intervalDays,
      learningSteps: 0,
      reps: 1 + Math.floor(random() * 6),
      lapses: random() < 0.1 ? 1 : 0,
      state: 2,
      lastReview: lastReviewedAt,
    };
    const next: ReviewItem = {
      ...item,
      fsrs,
      leitner: { box: Math.min(5, 1 + Math.floor(intervalDays / 14)), due },
      due,
      lastReviewedAt,
    };
    log.push({
      at: lastReviewedAt,
      itemId: item.id,
      cardId: item.cardId,
      deckId: item.deckId,
      rating: 3,
      algorithm: 'fsrs',
      wasNew: false,
      fsrs: {
        state: 2,
        stability: stability * 0.8,
        difficulty: fsrs.difficulty,
        elapsedDays: intervalDays,
        scheduledDays: intervalDays,
        learningSteps: 0,
      },
      before: {
        fsrs: { ...fsrs, reps: Math.max(0, fsrs.reps - 1) },
        leitner: next.leitner ?? { box: 1, due },
        due,
        lastReviewedAt: lastReviewedAt - intervalDays * DAY,
      },
    });
    events.push({
      at: lastReviewedAt,
      type: 'reviewed',
      cardId: item.cardId,
      deckId: item.deckId,
      itemId: item.id,
      rating: 3,
      first: false,
    });
    return next;
  });

  const sorted = events.sort((a, b) => a.at - b.at).map((event, i) => ({ ...event, seq: i + 1 }));
  const reviewLog = log.sort((a, b) => a.at - b.at).map((entry, i) => ({ ...entry, seq: i + 1 }));
  const since = dayStart(addDays(today, -WEEKS * 7)).getTime();
  return {
    cards: count,
    items: items.length,
    decks: decks.length,
    reviews: reviewLog.length,
    tables: {
      areas,
      decks,
      cards,
      reviewItems: learned,
      reviewLog,
      events: sorted,
      dayStats: dayRows(sorted, DEFAULT_GOALS),
      profile: [{ id: 'me', name: 'Groß', createdAt: since, updatedAt: since }],
      meta: [{ key: 'onboardedAt', value: since }],
    },
  };
}
