import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { useSearchParams } from 'react-router';
import { counter, isBundle, progressPercent } from '@/domain/session/session';
import { endSummary, faceOf, plural } from '@/domain/session/present';
import type { RatingKey } from '@/domain/scheduler/rating';
import { setSurfaceColor } from '@/platform/theme';
import { areaCodeOf, useStudySession, type SessionEnd } from '@/features/study/useSession';
import { Button } from '../../components/Button';
import { Celebration } from '../../components/Celebration';
import { Sheet } from '../../components/Sheet';
import { StorageError } from '../../components/StorageError';
import { cx } from '../../cx';
import { useMediaQuery } from '../../useMediaQuery';
import { useGoBack } from '../../useGoBack';
import { colors } from '../../tokens/tokens';
import { LernenView, type Exit } from './LernenView';
import styles from './Lernen.module.css';

/** Wie weit der Finger ziehen muss, bis die Karte bewertet wird. */
const SWIPE_DISTANCE = 90;
/** Dauer, bis die Karte weggeflogen ist (Lernen.dc.html: 400 ms), dann kommt die nächste. */
const EXIT_MS = 400;

/**
 * Lernen (`/lernen`, optional `?stapel=<ID>`): die fälligen Abfragen aller Stapel oder eines Stapels.
 * Flip, Bewertung, Wischen (links Nochmal, rechts Gut), Rückgängig und Tastatur (Leertaste dreht,
 * 1 bis 4 bewerten, Pfeile links/rechts, Strg/Cmd+Z nimmt zurück, Esc beendet).
 */
export function Lernen() {
  const [params] = useSearchParams();
  const deckId = params.get('stapel') ?? undefined;
  const session = useStudySession(deckId);
  const goBack = useGoBack(deckId ? `/stapel/${deckId}` : '/');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [exit, setExit] = useState<Exit>('');
  const [drag, setDrag] = useState(0);
  const [asking, setAsking] = useState(false);
  const busy = useRef(false);
  const [animating, setAnimating] = useState(false);
  const timers = useRef<number[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const { state, station } = session;
  const flipped = state.flipped;
  const bundle = isBundle(station);

  useEffect(() => {
    setSurfaceColor(document, colors.surface);
    return () => {
      setSurfaceColor(document, null);
    };
  }, []);
  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );

  const { rate, undo, flip, revealNext } = session;
  const leave = goBack;

  const rateWith = useCallback(
    (rating: RatingKey, by: 'button' | 'swipe') => {
      if (busy.current || !flipped) return;
      if (reduced) {
        rate(rating);
        return;
      }
      busy.current = true;
      setAnimating(true);
      setDrag(0);
      setExit(rating === 'again' ? (by === 'swipe' ? 'outL' : 'outD') : 'outR');
      timers.current.push(
        window.setTimeout(() => {
          rate(rating);
          setExit('enter');
          timers.current.push(
            window.setTimeout(() => {
              setExit('');
              busy.current = false;
              setAnimating(false);
            }, 40),
          );
        }, EXIT_MS),
      );
    },
    [flipped, rate, reduced],
  );

  const close = useCallback(() => {
    if (state.ratedItems > 0 && !state.done) setAsking(true);
    else leave();
  }, [state.ratedItems, state.done, leave]);

  const advance = useCallback(() => {
    if (busy.current) return;
    if (bundle) revealNext();
    else flip();
  }, [bundle, flip, revealNext]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (asking || session.status !== 'ready' || state.done) return;
      const onButton = event.target instanceof HTMLButtonElement;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (!busy.current) undo();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Escape') {
        close();
      } else if (event.key === ' ' || event.key === 'Enter') {
        if (onButton) return;
        event.preventDefault();
        if (!flipped) advance();
      } else if (flipped) {
        const keys: Record<string, RatingKey> = {
          '1': 'again',
          '2': 'hard',
          '3': 'good',
          '4': 'easy',
          ArrowLeft: 'again',
          ArrowRight: 'good',
        };
        const rating = keys[event.key];
        if (rating) {
          event.preventDefault();
          rateWith(rating, 'button');
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [asking, session.status, state.done, flipped, advance, rateWith, undo, close]);

  useEffect(() => {
    document.title = 'Lernen · Juri';
  }, []);

  if (session.status === 'error') return <StorageError />;
  if (session.status === 'loading') return null;

  if (state.done) {
    return session.end && state.ratedItems > 0 ? (
      <Geschafft
        end={session.end}
        back={deckId ? 'Zurück zum Stapel' : 'Zurück zu Heute'}
        onBack={leave}
        onMore={session.restart}
      />
    ) : (
      <Leer back={deckId ? 'Zurück zum Stapel' : 'Zurück zu Heute'} onBack={leave} />
    );
  }

  if (!station || !session.card || !session.preview) return null;
  const card = session.card;
  const face = faceOf(
    card,
    station.itemIds.map((id) => id.slice(card.id.length + 1)),
    state.revealed,
  );

  const cardEvents = {
    onPointerDown: (event: PointerEvent) => {
      if (busy.current) return;
      touch.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent) => {
      const start = touch.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) setDrag(dx);
    },
    onPointerUp: (event: PointerEvent) => {
      const start = touch.current;
      touch.current = null;
      if (!start) return;
      const dx = event.clientX - start.x;
      if (dx <= -SWIPE_DISTANCE) rateWith('again', 'swipe');
      else if (dx >= SWIPE_DISTANCE) rateWith('good', 'swipe');
      else setDrag(0);
    },
    onPointerCancel: () => {
      touch.current = null;
      setDrag(0);
    },
  };

  return (
    <>
      <LernenView
        counter={counter(state)}
        percent={progressPercent(state)}
        area={areaCodeOf(session.deck, session.areas)}
        norm={card.norm}
        face={face}
        note={card.note}
        flipped={flipped}
        behind={Math.min(2, state.queue.length - 1) as 0 | 1 | 2}
        intervals={session.preview}
        exit={exit}
        drag={drag}
        undoable={session.undoable && !animating}
        onClose={close}
        onFlip={advance}
        onRevealNext={advance}
        onRevealAll={() => {
          if (!busy.current) flip();
        }}
        onRate={(rating) => {
          rateWith(rating, 'button');
        }}
        onUndo={() => {
          if (!busy.current) undo();
        }}
        cardEvents={cardEvents}
      />
      <Sheet
        open={asking}
        onClose={() => {
          setAsking(false);
        }}
        eyebrow="Lernen beenden"
        title="Schon aufhören?"
      >
        <p className={styles.emptyText}>
          {plural(state.ratedItems, 'Bewertung ist', 'Bewertungen sind')} gespeichert. Die übrigen
          Karten bleiben fällig.
        </p>
        <Button
          variant="primary"
          block
          onClick={() => {
            setAsking(false);
          }}
        >
          Weiterlernen
        </Button>
        <Button variant="soft" size="md" block onClick={leave}>
          Beenden
        </Button>
      </Sheet>
    </>
  );
}

const TILES: readonly { key: RatingKey; label: string; className: string }[] = [
  { key: 'again', label: 'Nochmal', className: styles.statAgain ?? '' },
  { key: 'hard', label: 'Schwer', className: styles.statHard ?? '' },
  { key: 'good', label: 'Gut', className: styles.statGood ?? '' },
  { key: 'easy', label: 'Leicht', className: styles.statEasy ?? '' },
];

/** Ende einer Session (Lernen.dc.html „Geschafft.“). */
function Geschafft({
  end,
  back,
  onBack,
  onMore,
}: {
  end: SessionEnd;
  back: string;
  onBack: () => void;
  onMore: () => void;
}) {
  return (
    <main className={styles.done} aria-label="Geschafft">
      <div className={styles.doneInner}>
        <Celebration />
        <div className={styles.doneText}>
          <h1 className={styles.doneTitle}>Geschafft.</h1>
          <p className={styles.doneLead}>{endSummary(end)}</p>
        </div>
        <div className={styles.stats}>
          {TILES.map((tile) => (
            <div key={tile.key} className={cx(styles.stat, tile.className)}>
              <span className={styles.statNumber}>{end.counts[tile.key]}</span>
              <span className={styles.statLabel}>{tile.label}</span>
            </div>
          ))}
        </div>
        <div className={styles.doneActions}>
          <Button variant="primary" block onClick={onBack}>
            {back}
          </Button>
          {end.stillDue > 0 ? (
            <Button variant="soft" size="md" block onClick={onMore}>
              {plural(end.stillDue, 'Karte', 'Karten')} noch einmal lernen
            </Button>
          ) : null}
        </div>
      </div>
    </main>
  );
}

/** Nichts fällig: Die Seite ist per Adresse erreichbar, auch wenn alles erledigt ist. */
function Leer({ back, onBack }: { back: string; onBack: () => void }) {
  return (
    <main className={styles.screen} aria-label="Lernen">
      <div className={styles.empty}>
        <h1 className={styles.emptyTitle}>Nichts fällig.</h1>
        <p className={styles.emptyText}>
          Für heute ist alles gelernt. Neue Karten kommen morgen wieder dran.
        </p>
        <Button variant="primary" block className={styles.emptyAction} onClick={onBack}>
          {back}
        </Button>
      </div>
    </main>
  );
}
