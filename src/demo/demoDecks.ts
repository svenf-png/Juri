import type { BackupTables } from '@/domain/backup/codec';
import { buildCard, buildItems, checkCard } from '@/domain/cards/card';
import type { Area, Card, Deck, NewEvent, ReviewItem } from '@/domain/model/records';
import data from '../../testdaten/demo-stapel.json';

/**
 * Demo-Stapel (Entscheidung 10) aus `testdaten/demo-stapel.json`: echte juristische Inhalte
 * ohne Lernfortschritt, ein Stapel in zwei Rechtsgebieten (m:n). Die IDs sind fest, damit ein
 * zweites Laden nichts doppelt anlegt. Alles deterministisch aus `now`.
 */

const DAY = 86_400_000;

export interface DemoDecks {
  /** Nur Rechtsgebiete, die es noch nicht gibt (Kürzel als Schlüssel). */
  areas: Area[];
  decks: Deck[];
  cards: Card[];
  items: ReviewItem[];
  events: NewEvent[];
}

interface DemoCard {
  typ: 'frage' | 'luecke';
  vorderseite?: string;
  rueckseite?: string;
  text?: string;
  norm: string;
  tags: string[];
}

const KARTEN_PRO_STAPEL_ABSTAND = 60_000;

/**
 * Datensätze der Demo-Stapel. `existing` sind die vorhandenen Rechtsgebiete, Stapel- und Karten-IDs;
 * vorhandene Rechtsgebiete werden benutzt, vorhandene Stapel und Karten übersprungen. Die Stapel entstehen
 * zu den Zeitpunkten `starts` (der letzte Stapel jung, damit Heute „+N Karten angelegt“ zeigt).
 */
export function demoDecks(
  now: number,
  existing: {
    areas: readonly Area[];
    deckIds: ReadonlySet<string>;
    cardIds?: ReadonlySet<string>;
  } = { areas: [], deckIds: new Set() },
  starts?: readonly number[],
): DemoDecks {
  const areaId = new Map<string, string>();
  const areas: Area[] = [];
  data.rechtsgebiete.forEach((r, i) => {
    // Auch nach Umbenennen bleibt das Demo-Rechtsgebiet über seine feste ID erkennbar.
    const found = existing.areas.find((a) => a.code === r.kuerzel || a.id === r.id);
    if (found) {
      areaId.set(r.id, found.id);
    } else {
      areaId.set(r.id, r.id);
      areas.push({
        id: r.id,
        code: r.kuerzel,
        name: r.name,
        createdAt: now + i,
        updatedAt: now + i,
      });
    }
  });
  const result: DemoDecks = { areas, decks: [], cards: [], items: [], events: [] };
  data.stapel.forEach((s, di) => {
    if (existing.deckIds.has(s.id)) return;
    const start = starts?.[di] ?? now;
    result.decks.push({
      id: s.id,
      name: s.name,
      norm: s.normen,
      areaIds: s.rechtsgebiete.map((code) => {
        const area = data.rechtsgebiete.find((r) => r.kuerzel === code);
        const id = area ? areaId.get(area.id) : undefined;
        if (!id) throw new Error(`Unbekanntes Rechtsgebiet ${code} im Demo-Stapel ${s.id}`);
        return id;
      }),
      createdAt: start,
      updatedAt: start,
    });
    (s.karten as DemoCard[]).forEach((k, ci) => {
      const checked = checkCard({
        type: k.typ === 'frage' ? 'qa' : 'cloze',
        front: k.vorderseite ?? '',
        back: k.rueckseite ?? '',
        text: k.text ?? '',
        norm: k.norm,
        tags: k.tags.join(' '),
      });
      if (!checked.ok) throw new Error(`Ungültige Demo-Karte ${s.id} Nr. ${ci + 1}`);
      const at = start + ci * KARTEN_PRO_STAPEL_ABSTAND;
      const card = buildCard(
        `${s.id}-${String(ci + 1).padStart(2, '0')}`,
        s.id,
        checked.fields,
        at,
        at,
      );
      // Eine Demo-Karte, die schon woanders liegt (Stapel gelöscht, Karte verschoben), bleibt dort.
      if (existing.cardIds?.has(card.id)) return;
      result.cards.push(card);
      result.items.push(...buildItems(card, at));
      result.events.push({ at, type: 'cardCreated', cardId: card.id, deckId: s.id });
    });
  });
  return result;
}

/** Tabellen des Demo-Profils: die Demo-Stapel, über 26 Wochen verteilt angelegt. */
export function demoDeckTables(now: number): BackupTables {
  const starts = [26 * 7 * DAY, 20 * 7 * DAY, 14 * 7 * DAY, 8 * 7 * DAY, 2 * DAY].map(
    (ago) => now - ago,
  );
  const demo = demoDecks(now, undefined, starts);
  const events = [...demo.events].sort((a, b) => a.at - b.at).map((e, i) => ({ ...e, seq: i + 1 }));
  return {
    areas: demo.areas,
    decks: demo.decks,
    cards: demo.cards,
    reviewItems: demo.items,
    events,
  };
}
