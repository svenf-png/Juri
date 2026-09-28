import { useCallback } from 'react';
import { parseDayKey, addDays, dayStart } from '@/domain/calendar/day';
import { readCard } from '@/data/repositories/cards';
import {
  readCreateSnapshot,
  readDeckDetail,
  readLibrary,
  readSearchSnapshot,
  readTodaySnapshot,
} from '@/data/repositories/library';
import { readStudy } from '@/data/repositories/study';
import { WEEK_DAYS } from '@/domain/today/today';
import { useLive } from './useLive';

/** Rechtsgebiete, Stapel und Mengen für die Bibliothek. */
export function useLibraryData() {
  return useLive('library', readLibrary);
}

/** Stapel-Detail mit Abfragen und Lernzustand; `dayKey` ist der aktuelle Lerntag. */
export function useDeckDetail(deckId: string | undefined, dayKey: string) {
  const query = useCallback(
    (db: Parameters<typeof readDeckDetail>[0]) =>
      readDeckDetail(db, deckId ?? '', dayStart(parseDayKey(dayKey)).getTime()),
    [deckId, dayKey],
  );
  return useLive(`deck:${deckId ?? ''}:${dayKey}`, query, deckId !== undefined);
}

/** Abfragen mit Lernzustand und Einstellungen; Grundlage für die Fälligkeit je Stapel. */
export function useStudyData(dayKey: string) {
  const query = useCallback(
    (db: Parameters<typeof readStudy>[0]) => readStudy(db, dayStart(parseDayKey(dayKey)).getTime()),
    [dayKey],
  );
  return useLive(`study:${dayKey}`, query);
}

/** Grundlage für Heute: die Daten der letzten 7 Lerntage bis einschließlich `dayKey`. */
export function useTodayData(dayKey: string) {
  const query = useCallback(
    (db: Parameters<typeof readTodaySnapshot>[0]) =>
      readTodaySnapshot(
        db,
        dayStart(addDays(parseDayKey(dayKey), 1 - WEEK_DAYS)).getTime(),
        dayStart(parseDayKey(dayKey)).getTime(),
      ),
    [dayKey],
  );
  return useLive(`today:${dayKey}`, query);
}

/** Stapel zur Auswahl, Tageszähler und Gesamtzahl für Erstellen. */
export function useCreateData(dayKey: string) {
  const query = useCallback(
    (db: Parameters<typeof readCreateSnapshot>[0]) =>
      readCreateSnapshot(db, dayStart(parseDayKey(dayKey)).getTime()),
    [dayKey],
  );
  return useLive(`create:${dayKey}`, query);
}

/** Alle Karten und Stapel für die Suche; läuft nur, solange gesucht wird. */
export function useSearchData(enabled: boolean) {
  return useLive('search', readSearchSnapshot, enabled);
}

/** Eine Karte samt Stapeln und Rechtsgebieten zum Bearbeiten; `card` ist `null`, wenn es sie nicht gibt. */
export function useEditData(cardId: string) {
  const query = useCallback(
    async (db: Parameters<typeof readCard>[0]) => {
      const [card, library] = await Promise.all([readCard(db, cardId), readLibrary(db)]);
      return { card, ...library };
    },
    [cardId],
  );
  return useLive(`edit:${cardId}`, query);
}
