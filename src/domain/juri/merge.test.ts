import { describe, expect, it } from 'vitest';
import { buildItems } from '../cards/card';
import type { Card } from '../model/records';
import { contentHash } from './hash';
import { omit } from './omit';
import { planMerge, uniqueName, type MergeLocal, type Resolution } from './merge';
import {
  EMPTY_LOCAL,
  NOW,
  SOURCE,
  applied,
  area,
  cloze,
  counter,
  deck,
  learned,
  pack,
  qa,
  schema,
} from './testkit';

const LATER = NOW + 86_400_000;

const run = (
  p = pack(),
  local: MergeLocal = EMPTY_LOCAL,
  mode: 'update' | 'copy' = 'update',
  decisions?: ReadonlyMap<string, Resolution>,
  now = NOW,
) =>
  planMerge({ pack: p, local, mode, now, newId: counter(), ...(decisions ? { decisions } : {}) });

/** Bestand eines Empfängers, der `p` schon einmal aktualisiert importiert hat, mit Lernfortschritt. */
function received(p = pack()) {
  const first = run(p);
  const local = applied(EMPTY_LOCAL, first);
  return {
    ...local,
    items: local.items.map((i) => ({
      ...learned({ id: i.cardId, deckId: i.deckId } as Card, i.sub),
    })),
  };
}

const card = (local: MergeLocal, id: string): Card => {
  const found = local.cards.find((c) => c.id === id);
  if (!found) throw new Error(`Karte ${id} fehlt`);
  return found;
};

describe('Aktualisieren in einen leeren Bestand', () => {
  it('legt Stapel, Rechtsgebiete, Karten, Abfragen und Medien an', () => {
    const plan = run();
    const w = plan.writes;
    expect(w.decks.map((d) => d.id)).toEqual(['deck-a']);
    expect(w.areas.map((a) => a.code).sort()).toEqual(['ZR', 'ÖR']);
    expect(w.decks[0]?.areaIds).toHaveLength(2);
    expect(w.cards).toHaveLength(4);
    // c1 (1), c2 (zwei Lücken), s1 (1), m1 (zwei Felder)
    expect(w.itemsAdd.map((i) => i.id).sort()).toEqual(
      ['c1', 'c2:c1', 'c2:c2', 'm1:m1', 'm1:m2', 's1'].sort(),
    );
    expect(w.media.map((m) => m.id).sort()).toEqual(['doc1', 'img1']);
    expect(w.events.every((e) => e.type === 'cardImported')).toBe(true);
    expect(w.newCards).toBe(4);
    expect(plan.summary).toMatchObject({ decksNew: 1, cardsNew: 4, mediaNew: 2, linksDropped: 0 });
    expect(plan.empty).toBe(false);
  });

  it('behält IDs und vermerkt den gemeinsamen Stand', () => {
    const local = applied(EMPTY_LOCAL, run());
    const c1 = card(local, 'c1');
    expect(c1.originHash).toBe(contentHash(c1));
    expect(local.decks[0]?.id).toBe('deck-a');
    // Abfragen der Karten stimmen mit dem überein, was das Anlegen erzeugen würde.
    expect(local.items.map((i) => i.id).sort()).toEqual(
      local.cards
        .flatMap((c) => buildItems(c, NOW))
        .map((i) => i.id)
        .sort(),
    );
  });

  it('gibt einen neuen Stapel mit gleichem Namen einen anderen Namen', () => {
    const local: MergeLocal = {
      ...EMPTY_LOCAL,
      decks: [deck('eigen', 'amtshaftung')],
      areas: [area('ZR')],
    };
    const plan = run(pack(), local);
    expect(plan.writes.decks[0]?.name).toBe('Amtshaftung (importiert)');
    expect(plan.writes.areas.map((a) => a.code)).toEqual(['ÖR']);
  });

  it('nimmt die Notiz aus der Datei für neue Karten', () => {
    const plan = run(pack(['deck-b'], { notes: true }));
    expect(plan.writes.cards.find((c) => c.id === 'c3')?.note).toBe('meine Notiz');
  });
});

describe('Aktualisieren behält den Lernfortschritt', () => {
  it('lässt Abfragen bestehender Karten unangetastet', () => {
    const local = received();
    const changed = {
      ...pack(),
      cards: pack().cards.map((c) =>
        c.id === 'c1' && c.type === 'qa' ? { ...c, back: 'Neu' } : c,
      ),
    };
    const plan = run(changed, local, 'update', undefined, LATER);
    expect(plan.summary.cardsUpdated).toBe(1);
    expect(plan.writes.itemsAdd).toEqual([]);
    expect(plan.writes.itemsDelete).toEqual([]);
    const next = applied(local, plan);
    expect(next.items.find((i) => i.id === 'c1')?.leitner?.box).toBe(3);
    const updated = card(next, 'c1');
    expect(updated.type === 'qa' && updated.back).toBe('Neu');
    expect(updated.createdAt).toBe(card(local, 'c1').createdAt);
  });

  it('ergänzt neue Lücken, streicht entfallene und behält den Rest', () => {
    const local = received();
    const changed = {
      ...pack(),
      cards: pack().cards.map((c) =>
        c.id === 'c2'
          ? cloze('c2', 'deck-a', 'Nur noch {{c2::§ 839 BGB}} und {{c3::Art. 34 GG}}.')
          : c,
      ),
    };
    const plan = run(changed, local, 'update', undefined, LATER);
    expect(plan.writes.itemsAdd.map((i) => i.id)).toEqual(['c2:c3']);
    expect(plan.writes.itemsDelete).toEqual(['c2:c1']);
  });

  it('übernimmt Änderungen der Datei, wenn du die Karte nicht angefasst hast', () => {
    const local = received();
    const changed = {
      ...pack(),
      cards: pack().cards.map((c) => (c.id === 'c1' ? qa('c1', 'deck-a', 'Neue Frage') : c)),
    };
    const plan = run(changed, local, 'update', undefined, LATER);
    expect(plan.conflicts).toEqual([]);
    expect(plan.summary.cardsUpdated).toBe(1);
  });

  it('bleibt bei deiner Karte, wenn nur du sie geändert hast', () => {
    const local = received();
    const mine = {
      ...card(local, 'c1'),
      type: 'qa' as const,
      front: 'Meine Frage',
      updatedAt: 99,
    } as Card;
    const withMine = { ...local, cards: local.cards.map((c) => (c.id === 'c1' ? mine : c)) };
    const plan = run(pack(), withMine, 'update', undefined, LATER);
    expect(plan.conflicts).toEqual([]);
    expect(plan.summary.cardsUpdated).toBe(0);
    expect(plan.writes.cards.find((c) => c.id === 'c1')).toBeUndefined();
  });

  it('behält deine Notiz und ergänzt eine mitgeschickte nur, wenn du keine hast', () => {
    const p = pack(['deck-b'], { notes: true });
    const local = received(pack(['deck-b'], { notes: false }));
    const changed = {
      ...p,
      cards: p.cards.map((c) => (c.id === 'c3' && c.type === 'qa' ? { ...c, front: 'Neu' } : c)),
    };
    const noNote = run(changed, local, 'update', undefined, LATER);
    expect(noNote.writes.cards.find((c) => c.id === 'c3')?.note).toBe('meine Notiz');
    const withOwn = {
      ...local,
      cards: local.cards.map((c) => (c.id === 'c3' ? { ...c, note: 'eigene' } : c)),
    };
    const own = run(changed, withOwn, 'update', undefined, LATER);
    expect(own.writes.cards.find((c) => c.id === 'c3')?.note).toBe('eigene');
  });
});

describe('doppelter Import', () => {
  it('ändert nichts', () => {
    const local = received();
    const again = run(pack(), local, 'update', undefined, LATER);
    expect(again.empty).toBe(true);
    expect(again.summary).toMatchObject({
      cardsNew: 0,
      cardsUpdated: 0,
      cardsUnchanged: 4,
      mediaNew: 0,
      decksNew: 0,
      decksKnown: 1,
    });
    expect(again.writes.cards).toEqual([]);
    expect(again.writes.events).toEqual([]);
  });

  it('vermerkt den gemeinsamen Stand für eigene Karten, die dem Import gleichen', () => {
    const p = pack();
    const own: MergeLocal = {
      ...EMPTY_LOCAL,
      decks: [deck('deck-a', 'Amtshaftung', ['area-ZR', 'area-ÖR'])],
      areas: [area('ZR'), area('ÖR')],
      cards: p.cards,
      media: p.media,
    };
    // Nichts Neues: leer, nichts wird geschrieben.
    expect(run(p, own).empty).toBe(true);
    // Kommt ein neuer Stapel dazu, wird der Stand der bekannten Karten mitgeschrieben.
    const plus = { ...pack(['deck-a', 'deck-b']) };
    const plan = run(plus, own);
    expect(plan.writes.cards.filter((c) => c.deckId === 'deck-a').every((c) => c.originHash)).toBe(
      true,
    );
  });
});

describe('Konflikte', () => {
  const both = () => {
    const local = received();
    const mine = { ...card(local, 'c1'), type: 'qa' as const, front: 'Meine Frage' } as Card;
    const withMine = { ...local, cards: local.cards.map((c) => (c.id === 'c1' ? mine : c)) };
    const p = {
      ...pack(),
      cards: pack().cards.map((c) => (c.id === 'c1' ? qa('c1', 'deck-a', 'Ihre Frage') : c)),
    };
    return { withMine, p };
  };

  it('erkennt „lokal und in der Datei geändert“; ohne Entscheidung bleibt deine Karte', () => {
    const { withMine, p } = both();
    const plan = run(p, withMine, 'update', undefined, LATER);
    expect(plan.conflicts).toMatchObject([
      {
        cardId: 'c1',
        kind: 'changed',
        resolution: 'mine',
        deckName: 'Amtshaftung',
        title: 'Ihre Frage',
      },
    ]);
    expect(plan.summary.cardsKeptMine).toBe(1);
    expect(plan.empty).toBe(false);
    const next = applied(withMine, plan);
    const c1 = card(next, 'c1');
    expect(c1.type === 'qa' && c1.front).toBe('Meine Frage');
    // Danach ist der Stand vermerkt: derselbe Import meldet keinen Konflikt mehr.
    expect(run(p, next, 'update', undefined, LATER).conflicts).toEqual([]);
  });

  it('übernimmt die Datei, wenn du „theirs“ wählst, und behält den Fortschritt', () => {
    const { withMine, p } = both();
    const plan = run(p, withMine, 'update', new Map([['c1', 'theirs']]), LATER);
    expect(plan.conflicts[0]?.resolution).toBe('theirs');
    const next = applied(withMine, plan);
    const c1 = card(next, 'c1');
    expect(c1.type === 'qa' && c1.front).toBe('Ihre Frage');
    expect(next.items.find((i) => i.id === 'c1')?.leitner?.box).toBe(3);
  });

  it('meldet eine lokal gelöschte Karte; sie bleibt gelöscht oder kommt zurück', () => {
    const local = received();
    const gone = {
      ...local,
      cards: local.cards.filter((c) => c.id !== 'c1'),
      items: local.items.filter((i) => i.cardId !== 'c1'),
    };
    const stay = run(pack(), gone, 'update', undefined, LATER);
    expect(stay.conflicts).toMatchObject([{ cardId: 'c1', kind: 'deleted', resolution: 'mine' }]);
    expect(stay.summary.cardsStayDeleted).toBe(1);
    expect(stay.writes.cards.find((c) => c.id === 'c1')).toBeUndefined();
    const back = run(pack(), gone, 'update', new Map([['c1', 'theirs']]), LATER);
    expect(back.writes.cards.find((c) => c.id === 'c1')).toBeDefined();
    expect(back.writes.itemsAdd.map((i) => i.id)).toContain('c1');
    expect(back.summary.cardsNew).toBe(1);
  });

  it('zählt eine nie gehabte Karte in einem bekannten Stapel als neu, nicht als Konflikt', () => {
    const local = received();
    const p = {
      ...pack(),
      cards: [...pack().cards, qa('c9', 'deck-a')],
      manifest: { ...pack().manifest },
    };
    const extended = pack();
    const plan = run(
      {
        ...extended,
        cards: p.cards,
        manifest: { ...extended.manifest, counts: { ...extended.manifest.counts, cards: 5 } },
      },
      local,
      'update',
      undefined,
      LATER,
    );
    expect(plan.conflicts).toEqual([]);
    expect(plan.summary.cardsNew).toBe(1);
  });

  it('bringt einen lokal gelöschten Stapel mit allen Karten zurück, ohne Konflikte', () => {
    const local = received();
    const none: MergeLocal = { ...local, decks: [], cards: [], items: [] };
    const plan = run(pack(), none, 'update', undefined, LATER);
    expect(plan.conflicts).toEqual([]);
    expect(plan.summary).toMatchObject({ decksNew: 1, cardsNew: 4 });
  });
});

describe('Karte im Import gelöscht', () => {
  it('bleibt bei dir, mit Fortschritt, und wird gezählt', () => {
    const local = received();
    const smaller = pack();
    const trimmed = {
      ...smaller,
      cards: smaller.cards.filter((c) => c.id !== 'c1'),
      manifest: {
        ...smaller.manifest,
        counts: { ...smaller.manifest.counts, cards: 3 },
        decks: [{ ...smaller.manifest.decks[0]!, cards: 3 }],
      },
    };
    const plan = run(trimmed, local, 'update', undefined, LATER);
    expect(plan.summary.cardsMissingInFile).toBe(1);
    expect(plan.summary.cardsUnchanged).toBe(3);
    expect(plan.empty).toBe(true);
    expect(applied(local, plan).cards.some((c) => c.id === 'c1')).toBe(true);
  });
});

describe('Verknüpfungen bei „Aktualisieren“', () => {
  it('übernimmt Verweise, wenn Schema und Zielkarte neu dazukommen', () => {
    const plan = run();
    const s1 = plan.writes.cards.find((c) => c.id === 's1');
    expect(s1?.type === 'schema' && s1.points.map((p) => p.link)).toEqual(['c1', undefined]);
    expect(plan.summary.linksDropped).toBe(0);
  });

  it('kappt Verweise, wenn die Zielkarte gelöscht bleibt', () => {
    // s1 kommt neu in einen bekannten Stapel, ihr Ziel c1 wurde lokal gelöscht und bleibt gelöscht.
    const first = received();
    const local: MergeLocal = {
      ...first,
      cards: first.cards.filter((c) => c.id !== 'c1' && c.id !== 's1'),
      items: first.items.filter((i) => i.cardId !== 'c1' && i.cardId !== 's1'),
      knownCardIds: new Set(['c1']),
    };
    const plan = run(pack(), local, 'update', undefined, LATER);
    const s1 = plan.writes.cards.find((c) => c.id === 's1');
    expect(s1?.type === 'schema' && s1.points.map((p) => p.link)).toEqual([undefined, undefined]);
    expect(plan.summary.linksDropped).toBe(1);
  });

  it('behält eigene Verknüpfungen eines Punkts, den die Datei ohne Verweis liefert', () => {
    const src = {
      ...SOURCE,
      cards: [schema('s1', 'deck-a', [undefined]), qa('c1', 'deck-a')],
      media: [],
    };
    const p = pack(['deck-a'], { source: src });
    const local = received(p);
    const mine = schema('s1', 'deck-a', ['c1'], { originHash: card(local, 's1').originHash });
    const withLink: MergeLocal = {
      ...local,
      cards: local.cards.map((c) => (c.id === 's1' ? mine : c)),
    };
    const updated = {
      ...p,
      cards: p.cards.map((c) =>
        c.id === 's1' && c.type === 'schema' ? { ...c, title: 'Neuer Titel' } : c,
      ),
    };
    // Ich habe den Verweis gesetzt (Änderung), die Datei den Titel: Konflikt, die Datei gewinnt, der Verweis bleibt.
    const plan = run(updated, withLink, 'update', new Map([['s1', 'theirs']]), LATER);
    const s1 = plan.writes.cards.find((c) => c.id === 's1');
    expect(s1?.type === 'schema' && s1.title).toBe('Neuer Titel');
    expect(s1?.type === 'schema' && s1.points[0]?.link).toBe('c1');
  });
});

describe('Medien', () => {
  it('nutzt vorhandene Medien mit gleicher ID, Art und Größe erneut', () => {
    const local = received();
    const plan = run(pack(['deck-a', 'deck-b']), local, 'update', undefined, LATER);
    expect(plan.writes.media).toEqual([]);
    expect(plan.summary.mediaNew).toBe(0);
  });

  it('vergibt eine neue ID, wenn dieselbe ID ein anderes Medium meint', () => {
    const local: MergeLocal = {
      ...EMPTY_LOCAL,
      media: [{ id: 'img1', kind: 'image', size: 999 }],
    };
    const plan = run(pack(), local);
    const created = plan.writes.media.find((m) => m.kind === 'image');
    expect(created?.id).not.toBe('img1');
    const m1 = plan.writes.cards.find((c) => c.id === 'm1');
    expect(m1?.type === 'cover' && m1.mediaId).toBe(created?.id);
  });

  it('gibt einer Kopie ein Bild einmal neu, auch wenn mehrere Karten es teilen', () => {
    const plan = run(pack(['deck-a', 'deck-b']), EMPTY_LOCAL, 'copy');
    const images = plan.writes.media.filter((m) => m.kind === 'image');
    expect(images).toHaveLength(1);
    const covers = plan.writes.cards.filter((c) => c.type === 'cover');
    const coverId = (c: Card | undefined) => (c?.type === 'cover' ? c.mediaId : undefined);
    expect(covers).toHaveLength(2);
    expect(new Set(covers.map(coverId)).size).toBe(1);
    expect(coverId(covers[0])).toBe(images[0]?.id);
    const withSource = covers.find((c) => c.source);
    expect(withSource?.source?.mediaId).toBe(plan.writes.media.find((m) => m.kind === 'pdf')?.id);
  });

  it('räumt Medien auf, die eine aktualisierte Karte nicht mehr braucht', () => {
    const p = pack();
    const local = received(p);
    const updated = {
      ...p,
      media: p.media.filter((m) => m.id !== 'doc1'),
      cards: p.cards.map((c) => {
        if (c.id !== 'm1') return c;
        return omit(c, 'source');
      }),
    };
    const plan = run(updated, local, 'update', undefined, LATER);
    expect(plan.writes.releaseMedia).toEqual(['doc1']);
  });
});

describe('Als Kopie', () => {
  it('vergibt für alles neue IDs, auch beim zweiten Mal', () => {
    const first = run(pack(), EMPTY_LOCAL, 'copy');
    const local = applied(EMPTY_LOCAL, first);
    const second = planMerge({
      pack: pack(),
      local,
      mode: 'copy',
      now: LATER,
      newId: counter('z'),
    });
    const ids = (p: typeof first) => [
      ...p.writes.cards.map((c) => c.id),
      ...p.writes.decks.map((d) => d.id),
    ];
    expect(ids(first).some((id) => ['c1', 'c2', 's1', 'm1', 'deck-a'].includes(id))).toBe(false);
    expect(ids(second).filter((id) => ids(first).includes(id))).toEqual([]);
    expect(second.writes.decks[0]?.name).toBe('Amtshaftung (Kopie)');
    const third = planMerge({
      pack: pack(),
      local: applied(local, second),
      mode: 'copy',
      now: LATER,
      newId: counter('y'),
    });
    expect(third.writes.decks[0]?.name).toBe('Amtshaftung (Kopie 2)');
  });

  it('baut Verknüpfungen, Lücken und Felder auf die neuen IDs um', () => {
    const plan = run(pack(), EMPTY_LOCAL, 'copy');
    const byOld = (title: string) =>
      plan.writes.cards.find((c) => c.type === 'schema' && c.title === title);
    const s = byOld('Schema s1');
    const target = plan.writes.cards.find((c) => c.type === 'qa');
    expect(s?.type === 'schema' && s.points[0]?.link).toBe(target?.id);
    const itemIds = plan.writes.itemsAdd.map((i) => i.id);
    const gap = plan.writes.cards.find((c) => c.type === 'cloze');
    expect(itemIds).toContain(`${gap?.id ?? ''}:c1`);
    const cov = plan.writes.cards.find((c) => c.type === 'cover');
    expect(itemIds).toContain(`${cov?.id ?? ''}:m2`);
    // Jede Abfrage verweist auf eine geschriebene Karte im geschriebenen Stapel.
    const cardIds = new Set(plan.writes.cards.map((c) => c.id));
    expect(plan.writes.itemsAdd.every((i) => cardIds.has(i.cardId))).toBe(true);
    expect(plan.writes.cards.every((c) => plan.writes.decks.some((d) => d.id === c.deckId))).toBe(
      true,
    );
    expect(plan.writes.cards.every((c) => c.originHash === undefined)).toBe(true);
  });

  it('kopiert unabhängig vom Bestand: kein Konflikt, kein Gleichstand mit vorhandenen Karten', () => {
    const local = received();
    const plan = run(pack(), local, 'copy', undefined, LATER);
    expect(plan.conflicts).toEqual([]);
    expect(plan.summary).toMatchObject({ decksNew: 1, cardsNew: 4, cardsMissingInFile: 0 });
    expect(plan.writes.newCards).toBe(4);
  });

  it('nimmt Notizen aus der Datei mit', () => {
    const plan = run(pack(['deck-b'], { notes: true }), EMPTY_LOCAL, 'copy');
    expect(plan.writes.cards.find((c) => c.type === 'qa')?.note).toBe('meine Notiz');
  });
});

describe('uniqueName und Hash', () => {
  it('kürzt lange Namen, damit die Grenze von 80 Zeichen hält', () => {
    const long = 'x'.repeat(80);
    const name = uniqueName(long, new Set(), 'Kopie');
    expect(name.length).toBeLessThanOrEqual(80);
    expect(name.endsWith(' (Kopie)')).toBe(true);
  });

  it('der Hash ignoriert Notiz, Zeitpunkte, Stapel und Reihenfolge der Tags', () => {
    const a = qa('c1', 'd1', 'F', { tags: ['a', 'b'], note: 'x' });
    const b = { ...a, deckId: 'd2', note: 'y', updatedAt: 5, tags: ['b', 'a'] } as Card;
    expect(contentHash(a)).toBe(contentHash(b));
    expect(contentHash(a)).toMatch(/^[0-9a-f]{16}$/);
    expect(contentHash(a)).not.toBe(contentHash({ ...a, front: 'anders' } as Card));
    expect(contentHash(a)).not.toBe(contentHash({ ...a, norm: '§ 1' }));
  });
});
