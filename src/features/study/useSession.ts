import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { JuriDb } from '@/data/db';
import { readLibrary } from '@/data/repositories/library';
import { rateItems, readCardsById, readStudyOf, undoRating } from '@/data/repositories/study';
import { dayKey as toDayKey, dayStart, learningDay, parseDayKey } from '@/domain/calendar/day';
import { relativeDays } from '@/domain/format/date';
import { sortAreas } from '@/domain/library/areas';
import type { Area, Card, Deck, ReviewItem } from '@/domain/model/records';
import { dueReviews, sessionItems } from '@/domain/scheduler/queue';
import { ratingValue, type RatingKey } from '@/domain/scheduler/rating';
import { previewIntervals, reviewItem, type IntervalPreview } from '@/domain/scheduler/schedule';
import type { LearningSettings } from '@/domain/scheduler/settings';
import {
  canUndo,
  current,
  flip as flipState,
  rate as rateState,
  revealNext as revealState,
  startSession,
  stationsFrom,
  summary as summaryOf,
  undo as undoState,
  type SessionState,
  type Station,
} from '@/domain/session/session';
import { database } from '../app/database';
import { dueContext } from './due';

interface Loaded {
  cards: ReadonlyMap<string, Card>;
  decks: ReadonlyMap<string, Deck>;
  areas: readonly Area[];
  settings: LearningSettings;
  dayKey: string;
  /** Alle Abfragen des Umfangs, für die Bilanz am Ende. */
  scope: readonly ReviewItem[];
  /** Fälligkeit mit Fristen neu rechnen (nach Bewertungen in dieser Session). */
  effective: (items: readonly ReviewItem[]) => ReviewItem[];
}

type Load =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; loaded: Loaded; initial: SessionState };

/** Umfang einer Session: alle fälligen Abfragen, die eines Stapels oder die einer einzelnen Karte. */
export interface StudyScope {
  deckId?: string | undefined;
  /** Eine Karte lernen, auch wenn sie nicht fällig ist (Verknüpfung „Karte lernen“). */
  cardId?: string | undefined;
}

async function load(db: JuriDb, scope: StudyScope): Promise<Load & { status: 'ready' }> {
  const key = toDayKey(learningDay(new Date()));
  const [study, library] = await Promise.all([
    readStudyOf(db, scope.deckId, dayStart(parseDayKey(key)).getTime()),
    readLibrary(db),
  ]);
  const ctx = dueContext(key, study);
  const picked =
    scope.cardId === undefined
      ? sessionItems(study.items, ctx, Math.random)
      : study.items.filter((item) => item.cardId === scope.cardId);
  const cards = await readCardsById(db, [...new Set(picked.map((item) => item.cardId))]);
  // Ein Schema deckt Punkt für Punkt auf: eine Abfrage, so viele Schritte wie Punkte.
  const steps = new Map(
    cards.flatMap((c) => (c.type === 'schema' ? [[c.id, c.points.length] as const] : [])),
  );
  const singles = new Set(cards.flatMap((c) => (c.type === 'cover' ? [c.id] : [])));
  const stations = stationsFrom(picked, steps, singles);
  return {
    status: 'ready',
    loaded: {
      cards: new Map(cards.map((c) => [c.id, c])),
      decks: new Map(library.decks.map((d) => [d.id, d])),
      areas: library.areas,
      settings: study.settings,
      dayKey: key,
      scope: study.items,
      effective: study.effective,
    },
    initial: startSession(stations),
  };
}

export interface SessionEnd {
  reviews: number;
  again: number;
  counts: SessionState['counts'];
  /** Wiederholungen, die noch heute wieder fällig sind (Lernschritte). */
  stillDue: number;
  /** „morgen“, „in 3 Tagen“; `null`, wenn nichts mehr ansteht. */
  next: string | null;
}

export interface StudySession {
  status: 'loading' | 'error' | 'ready';
  state: SessionState;
  station: Station | undefined;
  card: Card | undefined;
  deck: Deck | undefined;
  areas: readonly Area[];
  /** Abfragen der aktuellen Station in ihrem heutigen Zustand. */
  items: readonly ReviewItem[];
  preview: IntervalPreview | null;
  undoable: boolean;
  end: SessionEnd | null;
  flip: () => void;
  revealNext: () => void;
  rate: (rating: RatingKey) => void;
  undo: () => void;
  /** Baut die Session neu aus der Datenbank (nach dem Ende: Rest des Tages). */
  restart: () => void;
}

const EMPTY = startSession([]);

/**
 * Lernsession für alle fälligen Abfragen oder die eines Stapels. Die Maschine (domain/session)
 * hält den Ablauf; die Bewertung rechnet lokal mit derselben reinen Funktion wie die Datenbank, damit
 * Vorschau und nächste Karte sofort stimmen, und wird der Reihe nach gespeichert.
 */
export function useStudySession(scope: StudyScope): StudySession {
  const { deckId, cardId } = scope;
  const [run, setRun] = useState(0);
  const [loaded, setLoaded] = useState<Load>({ status: 'loading' });
  const [state, setState] = useState<SessionState>(EMPTY);
  const items = useRef(new Map<string, ReviewItem>());
  const undoStack = useRef<ReviewItem[][]>([]);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const failed = useRef(false);
  const [, force] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Erst was noch geschrieben wird, dann lesen (nach „Weiter lernen“).
    chain.current
      .then(() => load(database(), { deckId, cardId }))
      .then(
        (result) => {
          if (cancelled) return;
          items.current = new Map(result.loaded.scope.map((i) => [i.id, i]));
          undoStack.current = [];
          failed.current = false;
          setState(result.initial);
          setLoaded(result);
        },
        () => {
          if (!cancelled) setLoaded({ status: 'error' });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [deckId, cardId, run]);

  const enqueue = useCallback((task: () => Promise<void>) => {
    chain.current = chain.current.then(task).catch(() => {
      failed.current = true;
      force((n) => n + 1);
    });
  }, []);

  const settings = loaded.status === 'ready' ? loaded.loaded.settings : undefined;

  const rate = useCallback(
    (rating: RatingKey) => {
      const out = rateState(state, rating);
      if (!out || !settings) return;
      const now = Date.now();
      const before: ReviewItem[] = [];
      for (const id of out.effect.itemIds) {
        const item = items.current.get(id);
        if (!item) continue;
        before.push(item);
        items.current.set(id, reviewItem(item, ratingValue(rating), now, settings).item);
      }
      undoStack.current.push(before);
      setState(out.state);
      enqueue(() => rateItems(database(), out.effect.itemIds, rating, now));
    },
    [state, settings, enqueue],
  );

  const undo = useCallback(() => {
    const out = undoState(state);
    if (!out) return;
    for (const item of undoStack.current.pop() ?? []) items.current.set(item.id, item);
    setState(out.state);
    enqueue(() => undoRating(database(), out.effect.itemIds, Date.now()));
  }, [state, enqueue]);

  const station = current(state);
  const ready = loaded.status === 'ready' ? loaded.loaded : null;
  const card = station ? ready?.cards.get(station.cardId) : undefined;
  const stationItems = useMemo(
    () =>
      station
        ? station.itemIds.flatMap((id) => {
            const item = items.current.get(id);
            return item ? [item] : [];
          })
        : [],
    // Der Zustand ändert sich mit jeder Bewertung; die Abfragen dahinter liegen in `items`.
    [station, state],
  );
  const preview = useMemo(
    () =>
      ready && stationItems.length > 0
        ? previewIntervals(stationItems, Date.now(), ready.settings)
        : null,
    [ready, stationItems],
  );

  const end = useMemo<SessionEnd | null>(() => {
    if (!state.done || !ready) return null;
    const boundary = dueContext(ready.dayKey, {
      settings: ready.settings,
      startedToday: 0,
    }).endOfDay;
    const all = ready.effective([...items.current.values()]);
    const stillDue = dueReviews(all, boundary).length;
    const upcoming = all
      .map((i) => i.due)
      .filter((due): due is number => due !== undefined && due >= boundary)
      .sort((a, b) => a - b)[0];
    const today = parseDayKey(ready.dayKey);
    const next =
      upcoming === undefined ? null : relativeDays(today, learningDay(new Date(upcoming)));
    return { ...summaryOf(state), stillDue, next };
  }, [state, ready]);

  return {
    status: failed.current ? 'error' : loaded.status,
    state,
    station,
    card,
    deck: card ? ready?.decks.get(card.deckId) : undefined,
    areas: ready?.areas ?? [],
    items: stationItems,
    preview,
    undoable: canUndo(state),
    end,
    flip: () => {
      setState((s) => flipState(s));
    },
    revealNext: () => {
      setState((s) => revealState(s));
    },
    rate,
    undo,
    restart: () => {
      setLoaded({ status: 'loading' });
      setRun((n) => n + 1);
    },
  };
}

/** Kürzel des ersten Rechtsgebiets eines Stapels, wie die Karte es zeigt (Lernen.dc.html: „SR“). */
export function areaCodeOf(deck: Deck | undefined, areas: readonly Area[]): string {
  if (!deck) return '';
  return sortAreas(areas.filter((a) => deck.areaIds.includes(a.id)))[0]?.code ?? '';
}
