import { afterEach, describe, expect, it } from 'vitest';
import { dayStart, learningDay, parseDayKey, type Day } from '../calendar/day';
import type { Area, Deadline, Deck, ReviewItem } from '../model/records';
import { deadlineEvents, deadlinesIcs, icsFileName } from './calendar';
import { activeDeadlines, applyDeadlines, idHash, sprintOffset, sprintStart } from './effective';
import {
  checkDraft,
  draftOf,
  newDraft,
  normalizeTag,
  selectAll,
  toggleScope,
  type DeadlineDraft,
} from './form';
import { deadlinesModel, scopeLabel, todayDeadlines } from './list';
import {
  isEmptyScope,
  scopeMatcher,
  scopeTags,
  withoutArea,
  withoutDeck,
  type ScopeWorld,
} from './scope';
import { deadlineStatus, percent, sitsSecurely } from './status';

const day = (key: string): Day => parseDayKey(key);
const ms = (key: string, hour = 4) => {
  const d = day(key);
  return new Date(d.year, d.month - 1, d.day, hour).getTime();
};

const deck = (id: string, areaIds: string[]): Deck => ({
  id,
  name: id,
  norm: '',
  areaIds,
  createdAt: 1,
  updatedAt: 1,
});
const area = (id: string, code: string): Area => ({
  id,
  code,
  name: code,
  createdAt: 1,
  updatedAt: 1,
});
const decks = [deck('amt', ['zr', 'oer']), deck('delikt', ['zr']), deck('betrug', ['sr'])];
const areas = [area('zr', 'ZR'), area('oer', 'ÖR'), area('sr', 'SR')];
const world: ScopeWorld = {
  decks,
  cardTags: new Map([
    ['c-betrug', ['LLM']],
    ['c-delikt', ['LLM', 'schwer']],
  ]),
};

const item = (id: string, deckId: string, due?: number, lastReviewedAt?: number): ReviewItem => ({
  id,
  cardId: `c-${id}`,
  deckId,
  sub: '',
  createdAt: 1,
  ...(due === undefined ? {} : { due }),
  ...(lastReviewedAt === undefined ? {} : { lastReviewedAt }),
});

const scope = (over: Partial<Deadline['scope']> = {}): Deadline['scope'] => ({
  all: false,
  areaIds: [],
  deckIds: [],
  tags: [],
  ...over,
});

const deadline = (over: Partial<Deadline> = {}): Deadline => ({
  id: 'k1',
  kind: 'klausur',
  name: 'Klausur ZR',
  date: '2026-10-09',
  scope: scope({ areaIds: ['zr'] }),
  sprint: false,
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

const today = day('2026-09-28');

describe('Umfang', () => {
  it('löst Rechtsgebiete über die Stapel auf, einzelne Stapel und Tags der Karten', () => {
    const byArea = scopeMatcher(scope({ areaIds: ['zr'] }), world);
    expect(byArea(item('amt', 'amt'))).toBe(true);
    expect(byArea(item('delikt', 'delikt'))).toBe(true);
    expect(byArea(item('betrug', 'betrug'))).toBe(false);
    const byDeck = scopeMatcher(scope({ deckIds: ['betrug'] }), world);
    expect(byDeck(item('betrug', 'betrug'))).toBe(true);
    expect(byDeck(item('amt', 'amt'))).toBe(false);
    const byTag = scopeMatcher(scope({ tags: ['LLM'] }), world);
    expect(byTag(item('betrug', 'betrug'))).toBe(true);
    expect(byTag(item('delikt', 'delikt'))).toBe(true);
    expect(byTag(item('amt', 'amt'))).toBe(false);
  });

  it('nimmt bei „alle“ jede Abfrage und bei leerem Umfang keine', () => {
    expect(scopeMatcher(scope({ all: true }), world)(item('x', 'unbekannt'))).toBe(true);
    expect(scopeMatcher(scope(), world)(item('amt', 'amt'))).toBe(false);
    expect(isEmptyScope(scope())).toBe(true);
    expect(isEmptyScope(scope({ tags: ['a'] }))).toBe(false);
    expect(isEmptyScope(scope({ all: true }))).toBe(false);
  });

  it('nennt die Tags, nach denen gesucht wird, einmal und sortiert', () => {
    const list = [
      deadline({ scope: scope({ tags: ['b', 'a'] }) }),
      deadline({ id: 'k2', scope: scope({ tags: ['a'] }) }),
    ];
    expect(scopeTags(list)).toEqual(['a', 'b']);
  });

  it('entfernt gelöschte Stapel und Rechtsgebiete nur bei den betroffenen Fristen', () => {
    const list = [
      deadline({ id: 'a', scope: scope({ deckIds: ['amt', 'delikt'], areaIds: ['zr'] }) }),
      deadline({ id: 'b', scope: scope({ deckIds: ['betrug'] }) }),
    ];
    const [changed, ...rest] = withoutDeck(list, 'amt', 99);
    expect(rest).toEqual([]);
    expect(changed?.id).toBe('a');
    expect(changed?.scope.deckIds).toEqual(['delikt']);
    expect(changed?.updatedAt).toBe(99);
    const areaChanged = withoutArea(list, 'zr', 99);
    expect(areaChanged.map((d) => d.id)).toEqual(['a']);
    expect(areaChanged[0]?.scope.areaIds).toEqual([]);
    expect(withoutDeck(list, 'gibtsnicht', 1)).toEqual([]);
  });
});

describe('aktive Fristen', () => {
  it('zählt den Tag der Frist noch mit, danach nicht mehr, und ignoriert Fristen ohne Datum', () => {
    const list = [
      deadline({ id: 'heute', date: '2026-09-28' }),
      deadline({ id: 'gestern', date: '2026-09-27' }),
      deadline({ id: 'ohne' }),
    ];
    delete (list[2] as { date?: string }).date;
    expect(activeDeadlines(list, today).map((d) => d.id)).toEqual(['heute']);
  });
});

describe('Deckelung', () => {
  const ZR = deadline();
  const cap = ms('2026-10-08'); // letzter Lerntag vor dem 9.10.

  it('zieht Abfragen mit späterem Termin auf den letzten Lerntag vor der Frist vor', () => {
    const [a] = applyDeadlines([item('amt', 'amt', ms('2026-12-01'))], [ZR], world, today);
    expect(a?.due).toBe(cap);
  });

  it('lässt frühere Fälligkeiten, Abfragen außerhalb des Umfangs und neue Abfragen unberührt', () => {
    const early = item('amt', 'amt', ms('2026-09-30'));
    const outside = item('betrug', 'betrug', ms('2026-12-01'));
    const fresh = item('delikt', 'delikt');
    const result = applyDeadlines([early, outside, fresh], [ZR], world, today);
    expect(result[0]).toBe(early);
    expect(result[1]).toBe(outside);
    expect(result[2]).toBe(fresh);
  });

  it('verändert weder die Eingabe noch das gespeicherte due', () => {
    const original = item('amt', 'amt', ms('2026-12-01'));
    const copy = { ...original };
    applyDeadlines([original], [ZR], world, today);
    expect(original).toEqual(copy);
  });

  it('zieht nicht vor, wenn die Abfrage am letzten Lerntag schon gesehen wurde', () => {
    const seen = item('amt', 'amt', ms('2026-12-01'), ms('2026-10-08', 9));
    expect(applyDeadlines([seen], [ZR], world, day('2026-10-08'))[0]).toBe(seen);
    const before = item('amt', 'amt', ms('2026-12-01'), ms('2026-10-07', 20));
    expect(applyDeadlines([before], [ZR], world, day('2026-10-08'))[0]?.due).toBe(cap);
  });

  it('gilt am Tag der Frist noch und danach nicht mehr (normaler Rhythmus)', () => {
    const late = item('amt', 'amt', ms('2026-12-01'));
    expect(applyDeadlines([late], [ZR], world, day('2026-10-09'))[0]?.due).toBe(cap);
    expect(applyDeadlines([late], [ZR], world, day('2026-10-10'))[0]).toBe(late);
  });

  it('ignoriert Fristen ohne Datum', () => {
    const undated = { ...ZR };
    delete (undated as { date?: string }).date;
    const stored = item('amt', 'amt', ms('2026-12-01'));
    expect(applyDeadlines([stored], [undated], world, today)[0]).toBe(stored);
  });

  it('nimmt bei mehreren Fristen die früheste Forderung, auch über Stapel und Gebiete hinweg', () => {
    const list = [
      ZR,
      deadline({ id: 'k2', date: '2026-10-02', scope: scope({ deckIds: ['amt'] }) }),
      deadline({ id: 'k3', date: '2026-10-05', scope: scope({ areaIds: ['sr'] }) }),
    ];
    const r = applyDeadlines(
      [
        item('amt', 'amt', ms('2026-12-01')),
        item('delikt', 'delikt', ms('2026-12-01')),
        item('betrug', 'betrug', ms('2026-12-01')),
      ],
      list,
      world,
      today,
    );
    expect(r.map((i) => i.due)).toEqual([ms('2026-10-01'), ms('2026-10-08'), ms('2026-10-04')]);
  });

  it('macht das Ergebnis nie später als das gespeicherte due', () => {
    const dues = [ms('2026-09-01'), ms('2026-10-08'), ms('2026-10-09'), ms('2027-03-01')];
    for (const due of dues) {
      const [r] = applyDeadlines(
        [item('amt', 'amt', due)],
        [ZR, { ...ZR, sprint: true }],
        world,
        today,
      );
      expect(r?.due).toBeLessThanOrEqual(due);
    }
  });

  it('nimmt die Fristen der Uhr: vor 04:00 gilt noch der Vortag als Lerntag', () => {
    // 09.10., 03:30: Lerntag ist noch der 08.10., die Frist am 09.10. liegt einen Tag voraus.
    const lernTag = learningDay(new Date(2026, 9, 9, 3, 30));
    const r = applyDeadlines([item('amt', 'amt', ms('2026-12-01'))], [ZR], world, lernTag);
    expect(r[0]?.due).toBe(cap);
    expect(cap).toBeLessThanOrEqual(new Date(2026, 9, 9, 3, 30).getTime());
    // Ab 04:00 ist es der Tag der Frist selbst, sie gilt weiterhin.
    const tag = learningDay(new Date(2026, 9, 9, 4, 0));
    expect(applyDeadlines([item('amt', 'amt', ms('2026-12-01'))], [ZR], world, tag)[0]?.due).toBe(
      cap,
    );
    // Am 10.10. um 03:59 ist es noch der 09.10., um 04:00 vorbei.
    const noch = learningDay(new Date(2026, 9, 10, 3, 59));
    const vorbei = learningDay(new Date(2026, 9, 10, 4, 0));
    const stored = item('amt', 'amt', ms('2026-12-01'));
    expect(applyDeadlines([stored], [ZR], world, noch)[0]?.due).toBe(cap);
    expect(applyDeadlines([stored], [ZR], world, vorbei)[0]).toBe(stored);
  });
});

describe('Endspurt', () => {
  const sprint = deadline({ sprint: true });
  const first = sprintStart(day('2026-10-09'));

  it('beginnt 7 Tage vor der Frist', () => {
    expect(first).toEqual(day('2026-10-02'));
  });

  it('verteilt ungesehene Abfragen stabil auf die 7 Tage, nie später als der letzte Lerntag', () => {
    const ids = Array.from({ length: 200 }, (_, i) => `id-${String(i)}`);
    const offsets = new Set(ids.map(sprintOffset));
    expect([...offsets].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(sprintOffset('id-1')).toBe(sprintOffset('id-1'));
    expect(idHash('a')).not.toBe(idHash('b'));
    const items = ids.map((id) => item(id, 'amt', ms('2026-12-01')));
    const due = applyDeadlines(items, [sprint], world, today).map((i) => i.due ?? 0);
    expect(Math.min(...due)).toBe(ms('2026-10-02'));
    expect(Math.max(...due)).toBe(ms('2026-10-08'));
  });

  it('gilt eine Abfrage als erledigt, wenn sie im Endspurt gesehen wurde', () => {
    const seen = item('amt', 'amt', ms('2026-12-01'), ms('2026-10-03', 12));
    expect(applyDeadlines([seen], [sprint], world, day('2026-10-04'))[0]).toBe(seen);
    const before = item('amt', 'amt', ms('2026-12-01'), ms('2026-10-01', 12));
    expect(
      applyDeadlines([before], [sprint], world, day('2026-10-04'))[0]?.due,
    ).toBeLessThanOrEqual(ms('2026-10-08'));
  });

  it('zieht bei später angelegter Frist alles Ungesehene schon heute fällig', () => {
    const r = applyDeadlines(
      [item('amt', 'amt', ms('2026-12-01'))],
      [sprint],
      world,
      day('2026-10-08'),
    );
    expect(r[0]?.due).toBeLessThanOrEqual(ms('2026-10-08'));
  });

  it('überholt ohne Endspurt-Schalter die Deckelung nicht', () => {
    const r = applyDeadlines([item('amt', 'amt', ms('2026-12-01'))], [deadline()], world, today);
    expect(r[0]?.due).toBe(ms('2026-10-08'));
  });
});

describe('Zeitumstellung', () => {
  const previous = process.env.TZ;
  afterEach(() => {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  });

  it('bleibt bei 04:00 Ortszeit, auch über den Wechsel auf Winterzeit (25.10.2026)', () => {
    process.env.TZ = 'Europe/Berlin';
    const d = deadline({ date: '2026-10-27' });
    const [r] = applyDeadlines(
      [item('amt', 'amt', ms('2027-01-01'))],
      [d],
      world,
      day('2026-10-20'),
    );
    expect(r?.due).toBe(new Date(2026, 9, 26, 4).getTime());
    expect(new Date(r?.due ?? 0).getHours()).toBe(4);
    // Der Tag der Zeitumstellung hat 25 Stunden, zählt aber als ein Tag.
    expect(dayStart(day('2026-10-25')).getTime() - dayStart(day('2026-10-24')).getTime()).toBe(
      25 * 3_600_000,
    );
  });

  it('bleibt bei 04:00 Ortszeit, auch über den Wechsel auf Sommerzeit (29.03.2026)', () => {
    process.env.TZ = 'Europe/Berlin';
    const d = deadline({ date: '2026-03-31' });
    const [r] = applyDeadlines(
      [item('amt', 'amt', ms('2026-09-01'))],
      [d],
      world,
      day('2026-03-25'),
    );
    expect(new Date(r?.due ?? 0).getHours()).toBe(4);
    expect(new Date(r?.due ?? 0).getDate()).toBe(30);
    expect(dayStart(day('2026-03-29')).getTime() - dayStart(day('2026-03-28')).getTime()).toBe(
      23 * 3_600_000,
    );
  });
});

describe('Stand einer Frist', () => {
  const sure = ms('2026-11-01');
  const items = [
    item('amt', 'amt', sure, ms('2026-09-20')),
    item('delikt', 'delikt', ms('2026-09-30'), ms('2026-09-27')),
    item('delikt2', 'delikt'),
    item('betrug', 'betrug', sure),
  ];

  it('zählt Karten, Stapel und die Sicherheitsquote im Umfang', () => {
    const s = deadlineStatus(deadline(), items, world, today);
    expect(s).toMatchObject({ phase: 'upcoming', daysLeft: 11, cards: 3, decks: 2, items: 3 });
    expect(s.secure).toBe(33);
    expect(s.sprintFrom).toBeNull();
  });

  it('rundet die Quote ab: 100 heißt wirklich alle', () => {
    expect(percent(199, 200)).toBe(99);
    expect(percent(200, 200)).toBe(100);
    expect(percent(0, 0)).toBeNull();
  });

  it('lässt eine Abfrage sicher sitzen, wenn ihr Termin nicht vor der Frist liegt', () => {
    const date = day('2026-10-09');
    expect(sitsSecurely(item('a', 'amt', ms('2026-10-09')), date)).toBe(true);
    expect(sitsSecurely(item('a', 'amt', ms('2026-10-08', 20)), date)).toBe(false);
    expect(sitsSecurely(item('a', 'amt'), date)).toBe(false);
  });

  it('kennt die Phasen: ohne Datum, Endspurt, Frist heute und abgelaufen', () => {
    const undated = { ...deadline() };
    delete (undated as { date?: string }).date;
    expect(deadlineStatus(undated, items, world, today)).toMatchObject({
      phase: 'undated',
      daysLeft: null,
      secure: null,
    });
    const sprint = deadline({ sprint: true });
    expect(deadlineStatus(sprint, items, world, day('2026-10-01')).phase).toBe('upcoming');
    expect(deadlineStatus(sprint, items, world, day('2026-10-02')).phase).toBe('sprint');
    expect(deadlineStatus(sprint, items, world, day('2026-10-09'))).toMatchObject({
      phase: 'sprint',
      daysLeft: 0,
    });
    expect(deadlineStatus(sprint, items, world, day('2026-10-10'))).toMatchObject({
      phase: 'expired',
      daysLeft: -1,
    });
    expect(deadlineStatus(deadline(), items, world, day('2026-10-09')).phase).toBe('upcoming');
  });

  it('meldet keine Quote für einen leeren Umfang', () => {
    const s = deadlineStatus(deadline({ scope: scope() }), items, world, today);
    expect(s).toMatchObject({ cards: 0, decks: 0, items: 0, secure: null });
  });
});

describe('Liste', () => {
  const base = { items: [item('amt', 'amt', ms('2026-11-01'))], world, areas, decks, today };
  const llm = deadline({
    id: 'llm',
    kind: 'llm',
    name: 'Modul Vertragsrecht',
    date: '2027-01-15',
    scope: scope({ tags: ['LLM'] }),
  });
  const exam = deadline({
    id: 'exam',
    kind: 'exam',
    name: '2. Staatsexamen, schriftlich',
    scope: { all: true, areaIds: [], deckIds: [], tags: [] },
  });
  delete (exam as { date?: string }).date;
  const klausur = deadline({ sprint: true });
  const old = deadline({ id: 'old', name: 'Alt', date: '2026-09-01' });

  it('sortiert: bevorstehend, ohne Datum, abgelaufen; nur die erste ist groß', () => {
    const model = deadlinesModel({ ...base, deadlines: [old, exam, llm, klausur] });
    expect(model.cards.map((c) => [c.id, c.tone])).toEqual([
      ['k1', 'hero'],
      ['llm', 'plain'],
      ['exam', 'undated'],
      ['old', 'expired'],
    ]);
    expect(model.empty).toBe(false);
  });

  it('schreibt die Texte wie im Design', () => {
    const [hero, plain, undated, expired] = deadlinesModel({
      ...base,
      deadlines: [old, exam, llm, klausur],
    }).cards;
    expect(hero).toMatchObject({
      eyebrow: 'Klausur',
      detail: 'Fr, 9.10. · ZR · 1 Stapel · 1 Karte',
      count: { big: '11', unit: 'Tage' },
      sprint: 'Endspurt ab Fr, 2.10.',
    });
    expect(hero?.progress?.label).toBe('100 % sitzen sicher');
    expect(plain).toMatchObject({
      eyebrow: 'LL.M.',
      detail: 'Fr, 15.1.2027 · Tag #LLM · 0 Karten',
      count: { big: '109', unit: 'Tage' },
      progress: null,
    });
    expect(undated).toMatchObject({ detail: 'Alle Rechtsgebiete', count: null });
    expect(expired).toMatchObject({ detail: 'Di, 1.9. · ZR', count: null });
  });

  it('zeigt „Endspurt läuft“, „Heute“ und „1 Tag“', () => {
    const at = (key: string) =>
      deadlinesModel({ ...base, today: day(key), deadlines: [klausur] }).cards[0];
    expect(at('2026-10-03')?.sprint).toBe('Endspurt läuft');
    expect(at('2026-10-09')?.count).toEqual({ big: 'Heute', unit: '' });
    expect(at('2026-10-08')?.count).toEqual({ big: '1', unit: 'Tag' });
    expect(at('2026-10-08')?.detail).toContain('1 Karte');
    expect(deadlinesModel({ ...base, deadlines: [deadline()] }).cards[0]?.sprint).toBeNull();
  });

  it('meldet den Leerzustand', () => {
    expect(deadlinesModel({ ...base, deadlines: [] })).toEqual({ cards: [], empty: true });
  });

  it('sortiert gleiche Tage nach Name, abgelaufene mit der jüngsten zuerst', () => {
    const a = deadline({ id: 'b', name: 'Beta' });
    const b = deadline({ id: 'a', name: 'Alpha' });
    const o1 = deadline({ id: 'o1', date: '2026-09-01' });
    const o2 = deadline({ id: 'o2', date: '2026-09-10' });
    const ids = deadlinesModel({ ...base, deadlines: [a, b, o1, o2] }).cards.map((c) => c.id);
    expect(ids).toEqual(['a', 'b', 'o2', 'o1']);
  });

  it('beschreibt den Umfang in Worten', () => {
    expect(scopeLabel(scope({ areaIds: ['oer', 'zr'] }), areas, decks)).toBe('ZR, ÖR');
    expect(scopeLabel(scope({ deckIds: ['amt'] }), areas, decks)).toBe('amt');
    expect(scopeLabel(scope({ deckIds: ['amt', 'betrug'] }), areas, decks)).toBe(
      '2 Stapel gewählt',
    );
    expect(scopeLabel(scope({ tags: ['a', 'b'] }), areas, decks)).toBe('Tags #a, #b');
    expect(scopeLabel(scope({ areaIds: ['zr'], tags: ['a'] }), areas, decks)).toBe('ZR, Tag #a');
    expect(scopeLabel(scope(), areas, decks)).toBe('Kein Umfang gewählt');
  });

  it('liefert Heute die kommenden Fristen mit Quote', () => {
    const rows = todayDeadlines({ ...base, deadlines: [old, exam, klausur] });
    expect(rows).toEqual([{ id: 'k1', title: 'Klausur ZR', date: '2026-10-09', secureShare: 100 }]);
    const empty = todayDeadlines({ ...base, items: [], deadlines: [klausur] });
    expect(empty[0]?.secureShare).toBeUndefined();
  });
});

describe('Eingabe', () => {
  const ok: DeadlineDraft = { ...newDraft(), name: '  Klausur   ÖR ', date: '2026-10-09' };

  it('übernimmt gültige Eingaben und säubert den Namen', () => {
    const r = checkDraft(ok, today);
    expect(r).toEqual({
      ok: true,
      value: {
        kind: 'klausur',
        name: 'Klausur ÖR',
        date: '2026-10-09',
        scope: selectAll(),
        sprint: true,
      },
    });
  });

  it('erlaubt eine Frist ohne Datum und lässt das Feld weg', () => {
    const r = checkDraft({ ...ok, date: '' }, today);
    expect(r.ok && 'date' in r.value).toBe(false);
  });

  it('meldet Name, Datum und Umfang', () => {
    expect(checkDraft({ ...ok, name: ' ' }, today)).toMatchObject({
      ok: false,
      errors: { name: 'Gib der Frist einen Namen.' },
    });
    expect(checkDraft({ ...ok, name: 'x'.repeat(61) }, today)).toMatchObject({
      errors: { name: expect.stringContaining('zu lang') as string },
    });
    expect(checkDraft({ ...ok, date: '2026-09-27' }, today)).toMatchObject({
      errors: { date: 'Das Datum liegt in der Vergangenheit.' },
    });
    expect(checkDraft({ ...ok, date: '2026-02-31' }, today)).toMatchObject({
      errors: { date: 'Das ist kein gültiges Datum.' },
    });
    expect(checkDraft({ ...ok, scope: scope() }, today)).toMatchObject({
      errors: { scope: expect.stringContaining('mindestens') as string },
    });
  });

  it('erlaubt heute und ein unverändertes Datum einer abgelaufenen Frist', () => {
    expect(checkDraft({ ...ok, date: '2026-09-28' }, today).ok).toBe(true);
    expect(checkDraft({ ...ok, date: '2026-09-01' }, today, '2026-09-01').ok).toBe(true);
    expect(checkDraft({ ...ok, date: '2026-09-01' }, today, '2026-09-02').ok).toBe(false);
  });

  it('schaltet den Umfang um; „alle“ und Auswahl schließen sich aus', () => {
    let s = selectAll();
    s = toggleScope(s, 'areaIds', 'zr');
    expect(s).toEqual({ all: false, areaIds: ['zr'], deckIds: [], tags: [] });
    s = toggleScope(s, 'tags', 'LLM');
    s = toggleScope(s, 'areaIds', 'zr');
    expect(s).toEqual({ all: false, areaIds: [], deckIds: [], tags: ['LLM'] });
    expect(draftOf(deadline())).toMatchObject({ name: 'Klausur ZR', date: '2026-10-09' });
    const undated = { ...deadline() };
    delete (undated as { date?: string }).date;
    expect(draftOf(undated).date).toBe('');
  });

  it('macht Tags ohne #, Leerraum und Kommas', () => {
    expect(normalizeTag('  ##Vertrags recht, ')).toBe('Vertragsrecht');
    expect(normalizeTag('#')).toBe('');
  });
});

describe('Kalenderdatei', () => {
  const now = new Date('2026-09-28T10:00:00Z');
  const list = [
    deadline({ sprint: true }),
    deadline({ id: 'alt', date: '2026-09-01' }),
    deadline({ id: 'ohne', date: undefined }),
  ];

  it('macht je kommender Frist einen ganztägigen Termin, dazu den Endspurt', () => {
    const events = deadlineEvents(list, today, now);
    expect(events.map((e) => e.uid)).toEqual(['frist-k1@juri', 'frist-k1-endspurt@juri']);
    const ics = deadlinesIcs(list, today, now) ?? '';
    expect(ics).toContain('DTSTART;VALUE=DATE:20261009');
    expect(ics).toContain('DTEND;VALUE=DATE:20261010');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261002');
    expect(ics).toContain('TRIGGER:-PT900M');
    expect(ics).toContain('TRIGGER:PT540M');
    expect(ics).toContain('SUMMARY:Endspurt: Klausur ZR');
  });

  it('lässt den Endspurt weg, wenn er schon läuft oder aus ist', () => {
    expect(deadlineEvents(list, day('2026-10-03'), now)).toHaveLength(1);
    expect(deadlineEvents([deadline()], today, now)).toHaveLength(1);
  });

  it('liefert nichts ohne kommende Fristen und benennt die Datei nach dem Tag', () => {
    expect(deadlinesIcs([list[1] as Deadline], today, now)).toBeNull();
    expect(icsFileName(today)).toBe('juri-fristen-2026-09-28.ics');
  });
});
