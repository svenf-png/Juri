import { describe, expect, it } from 'vitest';
import type { HighFive } from '../juri/format';
import type { Achievements, Contact } from '../model/records';
import { planReceive, type ReceiveInput } from './incoming';

/** 10:00 Ortszeit: weit weg von Mitternacht bis 04:00 und der Zeitumstellung. */
const at = (day: number, hour = 10) => new Date(2026, 8, day, hour, 0).getTime();
const NOW = at(29);

const MARA = { id: 'mara-1', name: 'Mara' };
const SNAP: Achievements = { streak: 12, reviews: 300, created: 40, milestones: ['erste-karte'] };

const hf = (id: string, day = 28, over: Partial<HighFive> = {}): HighFive => ({
  id,
  at: at(day),
  ...over,
});

function input(over: Partial<ReceiveInput> = {}): ReceiveInput {
  return {
    ownId: 'ich-1',
    sender: MARA,
    createdAt: at(28),
    achievements: SNAP,
    highFives: [],
    contact: undefined,
    knownIds: new Set(),
    receivedDays: new Set(),
    now: NOW,
    ...over,
  };
}

describe('Eingehende High fives', () => {
  it('legt einen Kontakt aus Absender und Snapshot an, Meilensteine gelten als gefeiert', () => {
    const plan = planReceive(input());
    expect(plan.contactIsNew).toBe(true);
    expect(plan.empty).toBe(false);
    expect(plan.contact).toEqual({
      id: 'mara-1',
      sentName: 'Mara',
      firstSeenAt: NOW,
      lastSeenAt: at(28),
      snapshot: { at: at(28), achievements: SNAP },
      celebrated: ['m:erste-karte'],
    });
    expect(plan.kudos).toEqual([]);
  });

  it('nimmt ein High five an und merkt Anlass und Lerntag', () => {
    const plan = planReceive(input({ highFives: [hf('h1', 28, { win: '12 Tage in Folge' })] }));
    expect(plan.kudos).toEqual([
      {
        id: 'h1',
        direction: 'received',
        contactId: 'mara-1',
        at: at(28),
        day: '2026-09-28',
        win: '12 Tage in Folge',
        seen: false,
      },
    ]);
  });

  it('Datei ohne Absender-ID: kein Kontakt, kein High five zählt', () => {
    const plan = planReceive(input({ sender: { name: 'Mara' }, highFives: [hf('h1'), hf('h2')] }));
    expect(plan).toMatchObject({ contact: null, kudos: [], empty: true });
    expect(plan.skipped.noSender).toBe(2);
    expect(planReceive(input({ sender: undefined })).empty).toBe(true);
  });

  it('High five von sich selbst kommt nicht an und legt keinen Kontakt an', () => {
    const plan = planReceive(
      input({ sender: { id: 'ich-1', name: 'Ich' }, highFives: [hf('h1')] }),
    );
    expect(plan).toMatchObject({ contact: null, kudos: [], empty: true });
    expect(plan.skipped.fromSelf).toBe(1);
  });

  it('fremde High fives (anderer Empfänger) werden ignoriert, eigene und offene gezählt', () => {
    const plan = planReceive(
      input({
        highFives: [
          hf('a', 25, { to: 'jemand-anders' }),
          hf('b', 26, { to: 'ich-1' }),
          hf('c', 27),
        ],
      }),
    );
    expect(plan.kudos.map((k) => k.id)).toEqual(['b', 'c']);
    expect(plan.skipped.foreign).toBe(1);
    // Ohne eigene ID kann ein High five mit Empfänger nicht für mich sein.
    const noId = planReceive(input({ ownId: undefined, highFives: [hf('a', 25, { to: 'x' })] }));
    expect(noId.kudos).toEqual([]);
    expect(noId.skipped.foreign).toBe(1);
  });

  it('doppelte IDs zählen einmal: bekannte, und dieselbe ID zweimal in einer Datei', () => {
    const plan = planReceive(
      input({
        knownIds: new Set(['alt']),
        highFives: [hf('alt', 20), hf('neu', 21), hf('neu', 22)],
      }),
    );
    expect(plan.kudos.map((k) => k.id)).toEqual(['neu']);
    expect(plan.skipped.duplicate).toBe(2);
  });

  it('höchstens ein High five je Absender und Lerntag, das frühere zählt', () => {
    const plan = planReceive(
      input({
        receivedDays: new Set(['2026-09-20']),
        highFives: [hf('x', 20), hf('b', 27, {}), { id: 'a', at: at(27, 8) }, hf('c', 26)],
      }),
    );
    expect(plan.kudos.map((k) => k.id)).toEqual(['c', 'a']);
    expect(plan.skipped.perDay).toBe(2);
  });

  it('Lerntag, nicht Kalendertag: 02:00 gehört noch zum Vortag', () => {
    const plan = planReceive(input({ highFives: [{ id: 'n', at: at(28, 2) }] }));
    expect(plan.kudos[0]?.day).toBe('2026-09-27');
  });

  it('zu viele je Datei: nur die ersten 50 werden betrachtet', () => {
    const many = Array.from({ length: 60 }, (_, i) => hf(`h${String(i)}`, 1 + (i % 25), {}));
    const plan = planReceive(input({ highFives: many }));
    expect(plan.skipped.tooMany).toBe(10);
  });

  it('Zeitpunkte aus der Zukunft werden auf jetzt begrenzt', () => {
    const plan = planReceive(input({ highFives: [{ id: 'f', at: NOW + 99 * 86_400_000 }] }));
    expect(plan.kudos[0]?.at).toBe(NOW);
    expect(plan.kudos[0]?.day).toBe('2026-09-29');
  });

  it('derselbe Import ein zweites Mal ändert nichts', () => {
    const first = planReceive(input({ highFives: [hf('h1')] }));
    const again = planReceive(
      input({
        highFives: [hf('h1')],
        contact: first.contact as Contact,
        knownIds: new Set(['h1']),
        receivedDays: new Set(['2026-09-28']),
      }),
    );
    expect(again).toMatchObject({ contact: null, kudos: [], empty: true, contactIsNew: false });
    expect(again.skipped.duplicate).toBe(1);
  });

  it('ein umbenannter Kontakt behält seinen Namen, der gesendete Name wird aktualisiert', () => {
    const known: Contact = {
      id: 'mara-1',
      sentName: 'Mara',
      alias: 'Mara AG',
      firstSeenAt: 1,
      lastSeenAt: at(20),
      celebrated: ['streak:3'],
    };
    const plan = planReceive(input({ contact: known, sender: { id: 'mara-1', name: 'Mara M.' } }));
    expect(plan.contact).toMatchObject({
      alias: 'Mara AG',
      sentName: 'Mara M.',
      celebrated: ['streak:3'],
      lastSeenAt: at(28),
    });
    expect(plan.contact?.snapshot?.achievements).toEqual(SNAP);
  });

  it('ein älterer Snapshot überschreibt keinen neueren', () => {
    const known: Contact = {
      id: 'mara-1',
      sentName: 'Mara',
      firstSeenAt: 1,
      lastSeenAt: at(28),
      snapshot: { at: at(28), achievements: SNAP },
      celebrated: [],
    };
    const old = planReceive(
      input({
        contact: known,
        createdAt: at(10),
        achievements: { ...SNAP, streak: 1 },
      }),
    );
    expect(old.empty).toBe(true);
    expect(old.contact).toBeNull();
  });

  it('Mitreise abgeschaltet beim Absender: Kontakt ohne Snapshot, nichts zu feiern', () => {
    const plan = planReceive(input({ achievements: undefined }));
    expect(plan.contact?.snapshot).toBeUndefined();
    expect(plan.contact?.celebrated).toEqual([]);
  });
});
