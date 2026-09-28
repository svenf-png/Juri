import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ALL_AREAS, deckModel, libraryModel } from '@/domain/library/library';
import { searchCards, searchTokens } from '@/domain/library/search';
import { rememberDeck } from '@/platform/lastDeck';
import { removeDeck, switchDeckArea } from '@/features/library/actions';
import { useDeckDetail, useLibraryData, useSearchData } from '@/features/library/queries';
import { BackLink, ScreenTitle } from '../../components/Screen';
import { StorageError } from '../../components/StorageError';
import { useMediaQuery } from '../../useMediaQuery';
import { Bibliothek } from './Bibliothek';
import { AreaPickSheet, ConfirmSheet, GebieteSheet, StapelSheet } from './Sheets';
import { StapelDetail } from './StapelDetail';
import styles from './Stapel.module.css';

type SheetState = 'deck-new' | 'deck-edit' | 'deck-delete' | 'areas' | 'area-pick' | null;

/**
 * Stapel-Bereich: Übersicht unter `/stapel`, Detail unter `/stapel/:deckId`. Unter 1100 px zeigt
 * die Route eins von beiden, ab 1100 px stehen sie als Master-Detail nebeneinander (A8); ohne
 * Auswahl ist dort der erste Stapel offen.
 */
export function Stapel() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const library = useLibraryData();
  const [filter, setFilter] = useState(ALL_AREAS);
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const hintTimer = useRef<number | undefined>(undefined);

  const searchText = useDeferredValue(query).trim();
  const searching = searchText !== '';
  const searchData = useSearchData(searching);

  const model = useMemo(
    () =>
      library.status === 'ready'
        ? libraryModel(
            {
              areas: library.value.areas,
              decks: library.value.decks,
              cardCounts: library.value.cardCounts,
              // Bis M4 (Lern-Engine) ist jede neue Abfrage fällig (Annahme A19).
              dueCounts: library.value.itemCounts,
            },
            filter,
          )
        : null,
    [library, filter],
  );

  const hits = useMemo(
    () =>
      searching && searchData.status === 'ready'
        ? searchCards(searchText, searchData.value.cards, searchData.value.decks)
        : null,
    [searching, searchText, searchData],
  );

  // Ab 1100 px ist ohne Auswahl der erste Stapel offen; auf dem iPhone bleibt die Liste allein.
  const wide = useMediaQuery('(min-width: 1100px)');
  const selectedId = deckId ?? (wide ? model?.groups[0]?.stacks[0]?.id : undefined);
  const detail = useDeckDetail(selectedId);
  const deckReady = detail.status === 'ready' ? detail.value : null;

  useEffect(() => {
    if (deckReady) rememberDeck(deckReady.deck.id);
  }, [deckReady]);
  useEffect(() => () => window.clearTimeout(hintTimer.current), []);

  if (library.status === 'error' || detail.status === 'error') return <StorageError />;
  if (!model || library.status !== 'ready') return null;

  const { areas, decks } = library.value;
  const deckModelValue = deckReady
    ? deckModel({
        deck: deckReady.deck,
        areas: deckReady.areas,
        cards: deckReady.cards,
        itemCount: deckReady.itemCount,
        due: deckReady.itemCount,
      })
    : null;

  function say(message: string) {
    setNotice(message);
    window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => {
      setNotice(null);
    }, 3500);
  }

  function onToggleArea(areaId: string) {
    if (!deckReady) return;
    setNotice(null);
    switchDeckArea(deckReady.deck.id, areaId).then(
      (result) => {
        if (result === 'last') say('Ein Stapel braucht mindestens ein Rechtsgebiet.');
      },
      () => {
        say('Das hat nicht geklappt. Bitte versuche es noch einmal.');
      },
    );
  }

  const close = () => {
    setSheet(null);
  };

  return (
    <main className={styles.stapel} data-view={deckId ? 'detail' : 'list'}>
      <Bibliothek
        model={model}
        query={query}
        onQuery={setQuery}
        hits={hits}
        tokens={searchTokens(searchText)}
        selectedId={selectedId}
        onFilter={setFilter}
        onNewDeck={() => {
          setSheet('deck-new');
        }}
        onManageAreas={() => {
          setSheet('areas');
        }}
      />

      {deckModelValue && deckReady ? (
        <StapelDetail
          model={deckModelValue}
          onToggleArea={onToggleArea}
          notice={notice}
          onEdit={() => {
            setSheet('deck-edit');
          }}
          onDelete={() => {
            setSheet('deck-delete');
          }}
          onPickAreas={() => {
            setSheet('area-pick');
          }}
        />
      ) : selectedId && detail.status === 'ready' ? (
        <div className={styles.detail}>
          <BackLink to="/stapel" label="Stapel" />
          <ScreenTitle lead="Vielleicht wurde er gelöscht.">
            Diesen Stapel gibt es nicht
          </ScreenTitle>
        </div>
      ) : (
        <div className={styles.detail} />
      )}

      {sheet === 'deck-new' ? (
        <StapelSheet
          areas={areas}
          decks={decks}
          defaultAreaId={filter === ALL_AREAS ? undefined : filter}
          onClose={close}
          onSaved={(id) => {
            close();
            void navigate(`/stapel/${id}`);
          }}
        />
      ) : null}
      {sheet === 'deck-edit' && deckReady ? (
        <StapelSheet
          deck={deckReady.deck}
          areas={areas}
          decks={decks}
          onClose={close}
          onSaved={close}
        />
      ) : null}
      {sheet === 'deck-delete' && deckReady ? (
        <ConfirmSheet
          eyebrow="Stapel löschen"
          title={`„${deckReady.deck.name}“ mit allen Karten löschen?`}
          info={[
            ['Karten', String(deckReady.cards.length)],
            ['Abfragen', String(deckReady.itemCount)],
            ['Lernfortschritt', 'geht verloren'],
          ]}
          text="Das lässt sich nicht rückgängig machen. Ein Backup davor schützt dich."
          backup
          confirmLabel="Stapel löschen"
          onClose={close}
          onConfirm={async () => {
            await removeDeck(deckReady.deck.id);
            close();
            void navigate('/stapel', { replace: true });
          }}
        />
      ) : null}
      {sheet === 'areas' ? <GebieteSheet areas={areas} decks={decks} onClose={close} /> : null}
      {sheet === 'area-pick' && deckReady ? (
        <AreaPickSheet
          areas={deckReady.areas}
          deck={deckReady.deck}
          onToggle={onToggleArea}
          onClose={close}
        />
      ) : null}
    </main>
  );
}
