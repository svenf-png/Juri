import { describe, expect, it } from 'vitest';
import type { ReviewItem } from '../model/records';
import { dueReviews, dueSummary, endOfLearningDay, isDue, newRemaining, newToStart, sessionItems, shuffle } from './queue';
import { reviewItem } from './schedule';
import { DEFAULT_LEARNING } from './settings';

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 28, 10, 0).getTime();
const END = new Date(2026, 8, 29, 4, 0).getTime();

const item = (id: string, deckId = 'd1', createdAt = 1): ReviewItem => ({
  id,
  cardId: id,
  deckId,
  sub: '',
  createdAt,
});
const reviewed = (id: string, dueMs: number, deckId = 'd1'): ReviewItem => ({
  ...item(id, deckId),
  fsrs: {
    due: dueMs,
    stability: 5,
    difficulty: 5,
    scheduledDays: 5,
    learningSteps: 0,
    reps: 3,
    lapses: 0,
    state: 2,
    lastReview: dueMs - 5 * DAY,
  },
  due: dueMs,
});
const learning = (id: string, dueMs: number): ReviewItem => {
  const base = reviewed(id, dueMs);
  return { ...base, fsrs: { ...base.fsrs!, state: 1 } };
};
const none = () => 0;

describe('Tagesgrenze und Limits', () => {
  it('der Lerntag endet um 04:00 des nächsten Tages', () => {
    expect(endOfLearningDay(NOW)).toBe(END);
    expect(endOfLearningDay(new Date(2026, 8, 28, 2).getTime())).toBe(
      new Date(2026, 8, 28, 4).getTime(),
    );
  });

  it('Rest des Tageslimits für neue Abfragen', () => {
    expect(newRemaining(20, 5)).toBe(15);
    expect(newRemaining(20, 25)).toBe(0);
  });

  it('fällig ist, was vor dem Ende des Lerntags liegt', () => {
    expect(isDue(reviewed('a', END - 1), END)).toBe(true);
    expect(isDue(reviewed('a', END), END)).toBe(false);
    expect(isDue(item('a'), END)).toBe(false);
  });
});

describe('dueSummary', () => {
  const items = [
    reviewed('a', NOW - DAY, 'd1'),
    reviewed('b', END + DAY, 'd1'),
    reviewed('c', NOW, 'd2'),
    item('n1', 'd1', 1),
    item('n2', 'd1', 2),
    item('n3', 'd2', 3),
  ];

  it('zählt Wiederholungen und neue Abfragen bis zum Limit', () => {
    const s = dueSummary(items, { now: NOW, endOfDay: END, newRemaining: 2 });
    expect(s).toMatchObject({ total: 4, reviews: 2, fresh: 2 });
  });

  it('das Limit gilt je Stapel für sich, die Gesamtzahl nur einmal', () => {
    const s = dueSummary(items, { now: NOW, endOfDay: END, newRemaining: 1 });
    expect(s.total).toBe(3);
    expect(s.byDeck).toEqual({ d1: 2, d2: 2 });
  });

  it('ohne Limit keine neuen; nichts fällig ergibt 0', () => {
    expect(dueSummary(items, { now: NOW, endOfDay: END, newRemaining: 0 }).fresh).toBe(0);
    expect(dueSummary([], { now: NOW, endOfDay: END, newRemaining: 5 })).toEqual({
      total: 0,
      byDeck: {},
      reviews: 0,
      fresh: 0,
    });
  });

  it('neue Abfragen kommen in der Reihenfolge des Anlegens', () => {
    const picked = newToStart([item('z', 'd', 5), item('a', 'd', 1), item('m', 'd', 1)], 2);
    expect(picked.map((i) => i.id)).toEqual(['a', 'm']);
    expect(dueReviews(items, END)).toHaveLength(2);
  });
});

describe('Reihenfolge der Session', () => {
  const ctx = { now: NOW, endOfDay: END, newRemaining: 5 };

  it('Lernschritte zuerst, dann überfällige Tage vor heutigen, später Fälliges, zuletzt Neue', () => {
    const items = [
      item('neu'),
      reviewed('spaeter', NOW + 3600_000),
      reviewed('heute', NOW - 1000),
      reviewed('alt', NOW - 3 * DAY),
      learning('schritt', NOW - 5000),
      reviewed('morgen', END + 1),
    ];
    expect(sessionItems(items, ctx, none).map((i) => i.id)).toEqual([
      'schritt',
      'alt',
      'heute',
      'spaeter',
      'neu',
    ]);
  });

  it('mischt innerhalb eines Lerntags mit dem übergebenen Zufall, deterministisch', () => {
    const items = ['a', 'b', 'c', 'd'].map((id, i) => reviewed(id, NOW - 1000 - i));
    const first = sessionItems(items, ctx, () => 0).map((i) => i.id);
    const again = sessionItems(items, ctx, () => 0).map((i) => i.id);
    expect(first).toEqual(again);
    expect([...first].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(first).not.toEqual(['a', 'b', 'c', 'd']);
  });

  it('shuffle ist eine Permutation und nutzt nur den Zufall aus dem Parameter', () => {
    let n = 0;
    const seq = [0.9, 0.1, 0.5, 0.3];
    const out = shuffle([1, 2, 3, 4, 5], () => seq[n++ % seq.length]!);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('die Reihenfolge beachtet das Tageslimit für Neue', () => {
    const items = [item('a', 'd', 1), item('b', 'd', 2), item('c', 'd', 3)];
    expect(sessionItems(items, { ...ctx, newRemaining: 2 }, none).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('bewertete Abfragen ergeben nach dem Lernen einen anderen Platz', () => {
    const r = reviewItem(item('x'), 3, NOW, DEFAULT_LEARNING).item;
    // Lernschritt in 10 Minuten: noch heute fällig, aber später als jetzt.
    expect(sessionItems([r], ctx, none).map((i) => i.id)).toEqual(['x']);
  });
});
