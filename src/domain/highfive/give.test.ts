import { describe, expect, it } from 'vitest';
import type { Contact, Kudo } from '../model/records';
import { CARRY_DAYS, givenOn, lernDayOf, outgoingHighFives, planGive } from './give';
import type { Win } from './wins';

const at = (day: number, hour = 10) => new Date(2026, 8, day, hour, 0).getTime();
const NOW = at(29);
const DAY = 86_400_000;

const mara: Contact = {
  id: 'mara-1',
  sentName: 'Mara',
  firstSeenAt: 1,
  lastSeenAt: 2,
  celebrated: [],
};
const win: Win = {
  key: 'streak:12',
  text: '12 Tage in Folge',
  sentence: 'hat 12 Tage in Folge geschafft',
};

const kudo = (over: Partial<Kudo>): Kudo => ({
  id: 'k',
  direction: 'given',
  contactId: 'mara-1',
  at: NOW,
  day: '2026-09-29',
  seen: true,
  ...over,
});

describe('High five geben', () => {
  it('erzeugt ein gegebenes High five mit Anlass und merkt den Erfolg als gefeiert', () => {
    const plan = planGive({ contact: mara, win, kudos: [], now: NOW, newId: () => 'neu-1' });
    expect(plan).toEqual({
      kudo: {
        id: 'neu-1',
        direction: 'given',
        contactId: 'mara-1',
        at: NOW,
        day: '2026-09-29',
        win: '12 Tage in Folge',
        seen: true,
      },
      contact: { ...mara, celebrated: ['streak:12'] },
    });
  });

  it('einfach so: ohne Anlass, der Kontakt bleibt unverändert', () => {
    const plan = planGive({ contact: mara, win: undefined, kudos: [], now: NOW, newId: () => 'x' });
    expect(plan?.kudo.win).toBeUndefined();
    expect(plan?.contact).toBe(mara);
  });

  it('ein High five je Kontakt und Lerntag; andere Kontakte und andere Tage zählen nicht', () => {
    expect(givenOn([kudo({})], 'mara-1', '2026-09-29')).toBe(true);
    expect(givenOn([kudo({})], 'jonas-1', '2026-09-29')).toBe(false);
    expect(givenOn([kudo({ day: '2026-09-28' })], 'mara-1', '2026-09-29')).toBe(false);
    // Ein bekommenes High five gilt nicht als gegebenes.
    expect(givenOn([kudo({ direction: 'received' })], 'mara-1', '2026-09-29')).toBe(false);
    expect(
      planGive({ contact: mara, win, kudos: [kudo({})], now: NOW, newId: () => 'x' }),
    ).toBeNull();
  });

  it('Lerntag wechselt um 04:00', () => {
    expect(lernDayOf(at(29, 3))).toBe('2026-09-28');
    expect(lernDayOf(at(29, 4))).toBe('2026-09-29');
  });
});

describe('Mitreise', () => {
  it('nimmt gegebene High fives der letzten 30 Tage, neueste zuerst, mit Empfänger', () => {
    const list = [
      kudo({ id: 'alt', at: NOW - (CARRY_DAYS + 1) * DAY }),
      kudo({ id: 'a', at: NOW - 2 * DAY, win: '12 Tage in Folge' }),
      kudo({ id: 'b', at: NOW - DAY, contactId: 'jonas-1' }),
      kudo({ id: 'r', direction: 'received' }),
      kudo({ id: 'zukunft', at: NOW + DAY }),
    ];
    expect(outgoingHighFives(list, NOW)).toEqual([
      { id: 'b', at: NOW - DAY, to: 'jonas-1' },
      { id: 'a', at: NOW - 2 * DAY, to: 'mara-1', win: '12 Tage in Folge' },
    ]);
  });

  it('höchstens 50', () => {
    const many = Array.from({ length: 70 }, (_, i) =>
      kudo({ id: `k${String(i)}`, at: NOW - i * 1000 }),
    );
    expect(outgoingHighFives(many, NOW)).toHaveLength(50);
  });
});
