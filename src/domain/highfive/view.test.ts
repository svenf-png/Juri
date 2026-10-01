import { describe, expect, it } from 'vitest';
import type { Contact, Kudo } from '../model/records';
import { erfolgeHighFives, feierText, heuteHighFive, highFivesModel, whenLabel } from './view';

const at = (day: number, hour = 10) => new Date(2026, 8, day, hour, 0).getTime();
const NOW = at(29);

const contact = (over: Partial<Contact>): Contact => ({
  id: 'c',
  sentName: 'X',
  firstSeenAt: 1,
  lastSeenAt: at(28),
  celebrated: [],
  ...over,
});

const MARA = contact({
  id: 'mara',
  sentName: 'Mara',
  snapshot: { at: at(28), achievements: { streak: 12, reviews: 0, created: 0, milestones: [] } },
});
const JONAS = contact({
  id: 'jonas',
  sentName: 'Jonas',
  lastSeenAt: at(27),
  snapshot: { at: at(27), achievements: { streak: 0, reviews: 0, created: 200, milestones: [] } },
});

const received = (over: Partial<Kudo>): Kudo => ({
  id: 'r',
  direction: 'received',
  contactId: 'mara',
  at: at(28),
  day: '2026-09-28',
  seen: false,
  ...over,
});

describe('Beschriftung der Zeit', () => {
  it('heute, gestern, Wochentag, Datum', () => {
    expect(whenLabel('2026-09-29', '2026-09-29')).toBe('heute');
    expect(whenLabel('2026-09-28', '2026-09-29')).toBe('gestern');
    expect(whenLabel('2026-09-26', '2026-09-29')).toBe('Sa');
    expect(whenLabel('2026-09-23', '2026-09-29')).toBe('Mi');
    expect(whenLabel('2026-09-22', '2026-09-29')).toBe('22.09.');
  });
});

describe('Ansichtsmodell High fives', () => {
  it('ohne Kontakte: leer', () => {
    const m = highFivesModel([], [], NOW);
    expect(m).toMatchObject({ empty: true, people: [], received: [], unseen: [], contacts: [] });
  });

  it('wie im Design: Mara mit 12 Tagen, Jonas mit 200 Karten, Bekommen mit Anlass und Zeit', () => {
    const m = highFivesModel(
      [JONAS, MARA],
      [
        received({ id: 'r1', win: '1.000 Wiederholungen' }),
        received({ id: 'r2', contactId: 'jonas', at: at(26), day: '2026-09-26' }),
      ],
      NOW,
    );
    expect(m.people.map((p) => [p.name, p.win, p.sentence, p.given])).toEqual([
      ['Mara', '12 Tage in Folge', 'hat 12 Tage in Folge geschafft', false],
      ['Jonas', '200 Karten angelegt', 'hat 200 Karten angelegt', false],
    ]);
    expect(m.people[0]).toMatchObject({ initial: 'M', aria: 'High five an Mara' });
    expect(m.received.map((r) => [r.name, r.reason, r.when])).toEqual([
      ['Mara', 'für 1.000 Wiederholungen', 'gestern'],
      ['Jonas', 'einfach so', 'Sa'],
    ]);
    expect(m.unseen).toHaveLength(2);
  });

  it('nach dem Geben bleibt die Person heute mit lila Knopf, morgen verschwindet sie', () => {
    const given: Kudo = {
      id: 'g',
      direction: 'given',
      contactId: 'mara',
      at: NOW,
      day: '2026-09-29',
      win: '12 Tage in Folge',
      seen: true,
    };
    const done = { ...MARA, celebrated: ['streak:12'] };
    const today = highFivesModel([done], [given], NOW);
    expect(today.people).toMatchObject([
      { name: 'Mara', given: true, win: '12 Tage in Folge', open: null },
    ]);
    const tomorrow = highFivesModel([done], [given], at(30));
    expect(tomorrow.people).toEqual([]);
    expect(heuteHighFive(today)).toBeNull();
  });

  it('ein Kontakt ohne offenen Erfolg steht nicht unter „Neu“, aber in der Kontaktliste', () => {
    const quiet = contact({ id: 'q', sentName: 'Quiet' });
    const m = highFivesModel([quiet], [], NOW);
    expect(m.people).toEqual([]);
    expect(m.contacts).toMatchObject([{ id: 'q', name: 'Quiet', sub: 'zuletzt gesehen gestern' }]);
    expect(m.empty).toBe(false);
  });

  it('Kontaktliste mit Serie und eigenem Namen', () => {
    const m = highFivesModel([{ ...MARA, alias: 'Mara AG' }], [], NOW);
    expect(m.contacts[0]).toEqual({
      id: 'mara',
      name: 'Mara AG',
      initial: 'M',
      renamed: true,
      sentName: 'Mara',
      sub: '12 Tage in Folge · zuletzt gesehen gestern',
    });
  });

  it('begrenzt „Neu“ auf fünf Leute; High fives von unbekannten Kontakten fehlen', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      ...MARA,
      id: `m${String(i)}`,
      sentName: `P${String(i)}`,
    }));
    expect(highFivesModel(many, [], NOW).people).toHaveLength(5);
    expect(highFivesModel([MARA], [received({ contactId: 'weg' })], NOW).received).toEqual([]);
  });

  it('Heute und Erfolge bekommen die Daten', () => {
    const m = highFivesModel(
      [MARA, JONAS],
      [
        received({ id: 'r1' }),
        received({ id: 'r2', contactId: 'jonas', day: '2026-09-27', at: at(27) }),
      ],
      NOW,
    );
    expect(heuteHighFive(m)).toEqual({
      id: 'mara',
      name: 'Mara',
      text: 'hat 12 Tage in Folge geschafft',
    });
    expect(erfolgeHighFives(m)).toEqual({ received: 2, open: 2, names: 'Mara und Jonas' });
    const none = highFivesModel([], [], NOW);
    expect(erfolgeHighFives(none)).toEqual({ received: 0, open: 0, names: '' });
    expect(heuteHighFive(none)).toBeNull();
  });

  it('Feier: ein Absender mit Anlass, mehrere als Zahl', () => {
    const m = highFivesModel(
      [MARA, JONAS],
      [received({ id: 'r1', win: '1.000 Wiederholungen' })],
      NOW,
    );
    expect(feierText(m.unseen).text).toBe(
      'Mara schickt dir ein High five für 1.000 Wiederholungen.',
    );
    const two = highFivesModel(
      [MARA, JONAS],
      [received({ id: 'r1' }), received({ id: 'r2', contactId: 'jonas', day: '2026-09-27' })],
      NOW,
    );
    expect(feierText(two.unseen).text).toBe('2 neue High fives von Mara und Jonas.');
  });
});
