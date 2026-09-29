import { describe, expect, it } from 'vitest';
import type { ReviewItem } from '../model/records';
import { dueLabels, dueText, inDays } from './dueLabel';
import type { DueContext } from './queue';

const DAY = 86_400_000;
const NOW = new Date(2026, 8, 29, 10, 0).getTime();
const CTX: DueContext = {
  now: NOW,
  endOfDay: new Date(2026, 8, 30, 4, 0).getTime(),
  newRemaining: 1,
};

const fresh = (id: string, createdAt: number, cardId = id): ReviewItem => ({
  id,
  cardId,
  deckId: 'd',
  sub: '',
  createdAt,
});
const seen = (id: string, due: number, cardId = id): ReviewItem => ({
  ...fresh(id, 1, cardId),
  due,
  fsrs: {
    due,
    stability: 5,
    difficulty: 5,
    scheduledDays: 5,
    learningSteps: 0,
    reps: 3,
    lapses: 0,
    state: 2,
    lastReview: due - 5 * DAY,
  },
});

describe('inDays', () => {
  it('nennt Tage, Monate und Jahre', () => {
    expect(inDays(0)).toBe('heute');
    expect(inDays(1)).toBe('morgen');
    expect(inDays(5)).toBe('in 5 Tagen');
    expect(inDays(45)).toBe('in 45 Tagen');
    expect(inDays(60)).toBe('in 2 Monaten');
    expect(inDays(365)).toBe('in 1 Jahr');
    expect(inDays(800)).toBe('in 2 Jahren');
  });
});

describe('dueText', () => {
  it('unterscheidet überfällig, heute und später', () => {
    expect(dueText(NOW - 2 * DAY, CTX)).toBe('überfällig seit 2 Tagen');
    expect(dueText(NOW - DAY, CTX)).toBe('überfällig seit 1 Tag');
    expect(dueText(NOW - 1000, CTX)).toBe('heute fällig');
    expect(dueText(NOW + 3600_000, CTX)).toBe('heute fällig');
    expect(dueText(NOW + DAY, CTX)).toBe('fällig morgen');
    expect(dueText(NOW + 4 * DAY, CTX)).toBe('fällig in 4 Tagen');
  });
});

describe('dueLabels', () => {
  it('neue Karten: die ältesten bis zum Limit heute, die übrigen später', () => {
    const labels = dueLabels([fresh('b', 2), fresh('a', 1), fresh('c', 3)], CTX);
    expect(labels.get('a')).toBe('Neu, heute dran');
    expect(labels.get('b')).toBe('Neu, kommt später');
    expect(labels.get('c')).toBe('Neu, kommt später');
  });

  it('ohne Rest im Tageslimit kommt keine neue Karte heute dran', () => {
    const labels = dueLabels([fresh('a', 1)], { ...CTX, newRemaining: 0 });
    expect(labels.get('a')).toBe('Neu, kommt später');
  });

  it('Karte mit mehreren Abfragen: früheste Fälligkeit zählt', () => {
    const labels = dueLabels(
      [seen('x:c1', NOW + 9 * DAY, 'x'), seen('x:c2', NOW + 2 * DAY, 'x'), fresh('x:c3', 1, 'x')],
      CTX,
    );
    expect(labels.get('x')).toBe('fällig in 2 Tagen');
  });

  it('liefert für jede Karte genau einen Text', () => {
    const labels = dueLabels([seen('a', NOW - 1000), fresh('b', 1)], CTX);
    expect([...labels.keys()].sort()).toEqual(['a', 'b']);
  });
});
