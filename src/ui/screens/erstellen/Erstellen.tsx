import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { createGoal, savedToast } from '@/domain/cards/goal';
import { deckAreaCodes, deckLabel } from '@/domain/library/library';
import { readLastDeck, rememberDeck } from '@/platform/lastDeck';
import { addCard } from '@/features/library/actions';
import { useCreateData, useLibraryData } from '@/features/library/queries';
import { useLearningDayKey } from '@/features/today/useToday';
import { StorageError } from '../../components/StorageError';
import { useGoBack } from '../../useGoBack';
import { StapelSheet, StapelWaehlenSheet } from '../stapel/Sheets';
import { CardScreen } from './CardScreen';
import { EMPTY_FORM } from './form';
import styles from './Erstellen.module.css';

/** Meldung „+1“ nach dem Speichern (Erstellen.dc.html). */
export function CreatedToast({ title, sub }: { title: string; sub: string }) {
  return (
    <div className={styles.toast} role="status">
      <span className={styles.plus} aria-hidden="true">
        +1
      </span>
      <div className={styles.toastText}>
        <span className={styles.toastTitle}>{title}</span>
        <span className={styles.toastSub}>{sub}</span>
      </div>
    </div>
  );
}

/** Neue Karte (`/neu`, optional `?stapel=<ID>`): Frage oder Lückentext, „Speichern & nächste“. */
export function Erstellen() {
  const [params] = useSearchParams();
  const goBack = useGoBack('/');
  const library = useLibraryData();
  const counts = useCreateData(useLearningDayKey());
  const [chosen, setChosen] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'pick' | 'new' | null>(null);
  const [toast, setToast] = useState<{ key: number; title: string; sub: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const decks = library.status === 'ready' ? library.value.decks : null;
  const deckId = useMemo(() => {
    if (!decks) return null;
    const known = (id: string | null | undefined) =>
      id && decks.some((d) => d.id === id) ? id : null;
    const newest = [...decks].sort((a, b) => b.createdAt - a.createdAt)[0]?.id ?? null;
    return known(chosen) ?? known(params.get('stapel')) ?? known(readLastDeck()) ?? newest;
  }, [decks, chosen, params]);

  if (library.status === 'error' || counts.status === 'error') return <StorageError />;
  if (library.status !== 'ready' || counts.status !== 'ready') return null;
  const { areas, cardCounts } = library.value;
  const deck = library.value.decks.find((d) => d.id === deckId);
  const made = counts.value.madeToday;

  return (
    <>
      <CardScreen
        mode="new"
        initial={EMPTY_FORM}
        deckLabel={deck ? deckLabel(deck, areas) : null}
        deck={deck ? { id: deck.id, name: deck.name, areaCodes: deckAreaCodes(deck, areas) } : null}
        onPickDeck={() => {
          setSheet('pick');
        }}
        onClose={goBack}
        goal={createGoal(made)}
        onSubmit={async (fields) => {
          if (!deck) {
            setSheet('pick');
            return false;
          }
          await addCard(deck.id, fields);
          rememberDeck(deck.id);
          setToast({ key: Date.now(), ...savedToast(made + 1, counts.value.total + 1) });
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => {
            setToast(null);
          }, 2450);
          return true;
        }}
        toast={toast ? <CreatedToast key={toast.key} title={toast.title} sub={toast.sub} /> : null}
      />
      {sheet === 'pick' ? (
        <StapelWaehlenSheet
          areas={areas}
          decks={library.value.decks}
          cardCounts={cardCounts}
          selectedId={deck?.id}
          onPick={(id) => {
            setChosen(id);
            setSheet(null);
          }}
          onNew={() => {
            setSheet('new');
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {sheet === 'new' ? (
        <StapelSheet
          areas={areas}
          decks={library.value.decks}
          onClose={() => {
            setSheet(null);
          }}
          onSaved={(id) => {
            setChosen(id);
            setSheet(null);
          }}
        />
      ) : null}
    </>
  );
}
