import { describe, expect, it } from 'vitest';
import { NOTHING_SKIPPED, type ReceivePlan } from './incoming';
import { countText, greetingProblem } from './text';

const plan = (over: Partial<ReceivePlan['skipped']>, kudos = 0): ReceivePlan => ({
  contact: null,
  contactIsNew: false,
  kudos: Array.from({ length: kudos }, (_, i) => ({
    id: `k${String(i)}`,
    direction: 'received' as const,
    contactId: 'c',
    at: 1,
    day: '2026-09-28',
    seen: false,
  })),
  skipped: { ...NOTHING_SKIPPED, ...over },
  empty: kudos === 0,
});

describe('Texte', () => {
  it('nennt den Grund, warum nichts ankommt', () => {
    expect(greetingProblem(plan({}, 1))).toBeNull();
    expect(greetingProblem(plan({ fromSelf: 1 }))).toBe(
      'Dieses High five hast du selbst geschickt.',
    );
    expect(greetingProblem(plan({ foreign: 1, duplicate: 1 }))).toBe(
      'Dieses High five ist für jemand anderen.',
    );
    expect(greetingProblem(plan({ duplicate: 1 }))).toBe(
      'Dieses High five hast du schon angenommen.',
    );
    expect(greetingProblem(plan({ perDay: 1 }))).toContain('schon ein High five');
    expect(greetingProblem(plan({ noSender: 1 }))).toContain('unbekannt');
    expect(greetingProblem(plan({}))).toContain('kein neues');
  });

  it('Zahl', () => {
    expect(countText(1)).toBe('ein High five');
    expect(countText(3)).toBe('3 High fives');
  });
});
