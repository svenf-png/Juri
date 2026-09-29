import { describe, expect, it } from 'vitest';
import type { Conflict, MergeSummary } from './merge';
import {
  CONFLICT_CHOICES,
  NOTHING_TO_IMPORT,
  cardsText,
  conflictText,
  conflictsLead,
  describeIncoming,
  exportSummary,
  firstDeckId,
  outcomeRows,
  packStats,
  shareCopy,
  updateHint,
} from './text';
import { EMPTY_LOCAL, counter, pack } from './testkit';
import { planMerge } from './merge';

const summary = (over: Partial<MergeSummary> = {}): MergeSummary => ({
  decksNew: 0,
  decksKnown: 1,
  cardsNew: 0,
  cardsUpdated: 0,
  cardsUnchanged: 0,
  cardsKeptMine: 0,
  cardsStayDeleted: 0,
  cardsMissingInFile: 0,
  mediaNew: 0,
  linksDropped: 0,
  ...over,
});

describe('exportSummary', () => {
  it('nennt Karten, PDFs, Bilder und Größe wie im Design', () => {
    expect(exportSummary({ cards: 21, pdfs: 3, images: 0 }, 2_400_000)).toBe(
      '21 Karten · 3 PDFs · 2,4 MB',
    );
  });
  it('lässt PDFs und Bilder weg, wenn es keine gibt, und nutzt die Einzahl', () => {
    expect(exportSummary({ cards: 1, pdfs: 0, images: 0 }, 900)).toBe('1 Karte · 900 B');
    expect(exportSummary({ cards: 2, pdfs: 1, images: 1 }, 5_000)).toBe(
      '2 Karten · 1 PDF · 1 Bild · 5,0 KB',
    );
  });
  it('zählt die Medien eines Pakets', () => {
    expect(packStats(pack())).toEqual({ cards: 4, pdfs: 1, images: 1 });
    expect(cardsText(1200)).toBe('1.200 Karten');
  });
});

describe('describeIncoming', () => {
  it('zeigt Stapelname, Absender und Anfangsbuchstaben', () => {
    const view = describeIncoming(pack());
    expect(view).toMatchObject({ title: 'Amtshaftung', meta: 'von Mara · 4 Karten', letter: 'M' });
    expect(view.decks).toEqual([{ name: 'Amtshaftung', cards: '4 Karten' }]);
  });
  it('fasst mehrere Stapel zusammen und kommt ohne Absender aus', () => {
    const many = pack(['deck-a', 'deck-b']);
    const anonymous = { ...many, manifest: { ...many.manifest, sender: undefined } };
    expect(describeIncoming(anonymous)).toMatchObject({
      title: '2 Stapel',
      meta: '6 Karten',
      letter: '?',
    });
  });
});

describe('updateHint', () => {
  it('sagt, wenn der Stapel neu ist', () => {
    expect(updateHint(summary({ decksKnown: 0, decksNew: 1 }))).toContain('kommt neu dazu');
  });
  it('nennt neue und geänderte Karten eines bekannten Stapels', () => {
    expect(updateHint(summary({ cardsNew: 3, cardsUpdated: 2 }))).toBe(
      'Du hast den Stapel schon. 3 neue Karten, 2 Karten geändert. Dein Fortschritt bleibt.',
    );
    expect(updateHint(summary({ cardsNew: 1 }))).toContain('1 neue Karte.');
  });
  it('sagt, wenn nichts fehlt', () => {
    expect(updateHint(summary())).toBe('Du hast schon alles. Dein Fortschritt bleibt.');
    expect(NOTHING_TO_IMPORT).toContain('nichts zu importieren');
  });
});

describe('Konflikte und Ergebnis', () => {
  const conflict = (kind: Conflict['kind']): Conflict => ({
    cardId: 'c1',
    deckId: 'd',
    deckName: 'StPO',
    title: 'Frage',
    kind,
    resolution: 'mine',
  });
  it('beschreibt beide Arten und ihre Auswahl', () => {
    expect(conflictText(conflict('changed')).detail).toBe(
      'StPO · Du und der Absender habt sie geändert',
    );
    expect(conflictText(conflict('deleted')).detail).toBe('StPO · Du hast die Karte gelöscht');
    expect(CONFLICT_CHOICES.deleted.theirs).toBe('Wiederherstellen');
    expect(conflictsLead(1)).toContain('Eine Karte');
    expect(conflictsLead(3)).toContain('3 Karten');
  });
  it('zählt das Ergebnis, Zeilen nur wenn nötig', () => {
    expect(outcomeRows(summary({ cardsNew: 3, cardsUpdated: 2 }))).toEqual([
      ['Neue Karten', '3'],
      ['Geändert', '2'],
    ]);
    expect(
      outcomeRows(
        summary({
          cardsNew: 1,
          cardsKeptMine: 1,
          cardsStayDeleted: 2,
          cardsMissingInFile: 4,
          linksDropped: 5,
        }),
      ),
    ).toEqual([
      ['Neue Karten', '1'],
      ['Geändert', '0'],
      ['Deine Version behalten', '3'],
      ['Beim Absender entfernt', '4'],
      ['Verknüpfungen gekappt', '5'],
    ]);
  });
  it('führt „Zum Stapel“ zum neuen oder zum ersten Stapel der Datei', () => {
    const p = pack();
    const plan = planMerge({ pack: p, local: EMPTY_LOCAL, mode: 'copy', now: 1, newId: counter() });
    expect(firstDeckId(p, plan)).toBe(plan.writes.decks[0]?.id);
    const update = planMerge({
      pack: p,
      local: EMPTY_LOCAL,
      mode: 'update',
      now: 1,
      newId: counter(),
    });
    expect(firstDeckId(p, { ...update, writes: { ...update.writes, decks: [] } })).toBe('deck-a');
  });
});

describe('shareCopy', () => {
  it('unterscheidet Teilen-Menü und Download', () => {
    expect(shareCopy('ios').action).toBe('AirDrop, Nachrichten, Mail …');
    expect(shareCopy('android').action).toBe('AirDrop, Nachrichten, Mail …');
    expect(shareCopy('desktop').action).toBe('Herunterladen');
    expect(shareCopy('ios').steps).toHaveLength(3);
    expect(shareCopy('desktop').steps[0]?.body).toContain('Downloads');
    expect(shareCopy('ios').receiveHint).toContain('„Dateien“');
  });
  it('enthält keine Gedankenstriche', () => {
    for (const env of ['ios', 'desktop'] as const) {
      expect(JSON.stringify(shareCopy(env))).not.toMatch(/[–—]/);
    }
  });
});
