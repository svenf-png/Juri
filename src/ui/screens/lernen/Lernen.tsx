import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { cardPreview, cardTitle } from '@/domain/cards/card';
import { counter, isBundle, progressPercent } from '@/domain/session/session';
import { faceOf, plural } from '@/domain/session/present';
import type { RatingKey } from '@/domain/scheduler/rating';
import { gestureHints, pointerVerbs } from '@/domain/device/environment';
import { currentEnvironment } from '@/features/app/install';
import { setSurfaceColor } from '@/platform/theme';
import { useCard } from '@/features/library/queries';
import type { FertigModel } from '@/domain/progress/celebrate';
import { acknowledgeMilestones, celebrationAfterSession } from '@/features/progress/actions';
import { useMediaUrl } from '@/features/media/media';
import { areaCodeOf, useStudySession } from '@/features/study/useSession';
import { Button } from '../../components/Button';
import { SurfaceImage, SurfaceMissing } from '../../components/CoverSurface';
import { Sheet } from '../../components/Sheet';
import { StorageError } from '../../components/StorageError';
import { useMediaQuery } from '../../useMediaQuery';
import { useGoBack } from '../../useGoBack';
import { colors } from '../../tokens/tokens';
import { Fertig } from './Fertig';
import { Geschafft } from './Geschafft';
import { LernenView, type Exit } from './LernenView';
import { SourceViewer } from '../pdf/SourceViewer';
import { LinkedCardSheet } from './LinkedCardSheet';
import styles from './Lernen.module.css';

/** Wie weit der Finger ziehen muss, bis die Karte bewertet wird. */
const SWIPE_DISTANCE = 90;
/** Dauer, bis die Karte weggeflogen ist (Lernen.dc.html: 400 ms), dann kommt die nächste. */
const EXIT_MS = 400;

/**
 * Lernen (`/lernen`, optional `?stapel=<ID>` oder `?karte=<ID>`): die fälligen Abfragen aller Stapel,
 * eines Stapels oder eine einzelne Karte (auch wenn sie nicht fällig ist).
 * Flip, Bewertung, Wischen (links Nochmal, rechts Gut), Rückgängig und Tastatur (Leertaste dreht,
 * 1 bis 4 bewerten, Pfeile links/rechts, Strg/Cmd+Z nimmt zurück, Esc beendet).
 */
export function Lernen() {
  const [params] = useSearchParams();
  const deckId = params.get('stapel') ?? undefined;
  const cardId = params.get('karte') ?? undefined;
  const session = useStudySession({ deckId, cardId });
  const navigate = useNavigate();
  const goBack = useGoBack(deckId ? `/stapel/${deckId}` : '/');
  const [linked, setLinked] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ mediaId: string; page: number | null } | null>(null);
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [exit, setExit] = useState<Exit>('');
  const [drag, setDrag] = useState(0);
  const [asking, setAsking] = useState(false);
  const busy = useRef(false);
  const [animating, setAnimating] = useState(false);
  const timers = useRef<number[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const { state, station } = session;
  // Feier „Tagesziel erreicht“: nur wenn das Ziel in dieser Session neu erreicht wurde.
  const [celebration, setCelebration] = useState<{
    model: FertigModel;
    milestones: string[];
  } | null>(null);
  const [showFertig, setShowFertig] = useState(false);
  const { flush, goalStart } = session;
  const ended = state.done && state.ratedItems > 0;
  useEffect(() => {
    if (!ended || !goalStart) return;
    let cancelled = false;
    flush()
      .then(() => celebrationAfterSession(goalStart))
      .then((result) => {
        if (!cancelled) setCelebration(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [ended, goalStart, flush]);
  const celebrating = celebration?.milestones;
  useEffect(() => {
    if (showFertig && celebrating && celebrating.length > 0) {
      acknowledgeMilestones(celebrating).catch(() => undefined);
    }
  }, [showFertig, celebrating]);
  const coverMedia = useMediaUrl(session.card?.type === 'cover' ? session.card.mediaId : null);
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
  const backLabel = cardId ? 'Zurück' : deckId ? 'Zurück zum Stapel' : 'Zurück zu Heute';

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
      if (asking || opened || session.status !== 'ready' || state.done) return;
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
  }, [asking, opened, session.status, state.done, flipped, advance, rateWith, undo, close]);

  useEffect(() => {
    document.title = 'Lernen · Juri';
  }, []);

  if (session.status === 'error') return <StorageError />;
  if (session.status === 'loading') return null;

  if (state.done) {
    if (showFertig && celebration) {
      return <Fertig model={celebration.model} onDone={leave} />;
    }
    return session.end && state.ratedItems > 0 ? (
      <Geschafft
        end={session.end}
        back={celebration ? 'Weiter' : backLabel}
        onBack={
          celebration
            ? () => {
                setShowFertig(true);
              }
            : leave
        }
        onMore={() => {
          setShowFertig(false);
          setCelebration(null);
          session.restart();
        }}
      />
    ) : (
      <Leer back={backLabel} onBack={leave} />
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
      // Bedienelemente in der Karte (Verknüpfung im Schema) sollen ihr Tippen behalten.
      if (busy.current || (event.target as Element).closest('[data-noswipe]')) return;
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
        counts={state.counts}
        open={state.queue.length}
        coverHint={gestureHints(currentEnvironment()).coverStudy}
        flipHint={`${pointerVerbs(currentEnvironment()).tap} zum Umdrehen`}
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
        coverImage={
          coverMedia.status === 'ready' ? (
            <SurfaceImage src={coverMedia.url} />
          ) : coverMedia.status === 'missing' ? (
            <SurfaceMissing />
          ) : null
        }
        coverRatio={
          coverMedia.status === 'ready' && coverMedia.record.width && coverMedia.record.height
            ? coverMedia.record.width / coverMedia.record.height
            : 1
        }
        onOpenLink={setLinked}
        onOpenSource={(mediaId, page) => {
          setOpened({ mediaId, page });
        }}
        cardEvents={cardEvents}
      />
      {opened ? (
        <SourceViewer
          mediaId={opened.mediaId}
          page={opened.page}
          onClose={() => {
            setOpened(null);
          }}
        />
      ) : null}
      <LinkedCard
        cardId={linked}
        onClose={() => {
          setLinked(null);
        }}
        onStudy={(id) => {
          setLinked(null);
          void navigate(`/lernen?karte=${encodeURIComponent(id)}`);
        }}
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

/** Verknüpfte Karte eines Schema-Punkts: liest die Karte und zeigt sie im Sheet. */
function LinkedCard({
  cardId,
  onClose,
  onStudy,
}: {
  cardId: string | null;
  onClose: () => void;
  onStudy: (cardId: string) => void;
}) {
  const data = useCard(cardId);
  const card = data.status === 'ready' ? data.value : null;
  return (
    <LinkedCardSheet
      open={cardId !== null}
      title={card ? [cardTitle(card), card.norm].filter((t) => t !== '').join(', ') : ''}
      text={card ? cardPreview(card) : ''}
      missing={cardId !== null && data.status === 'ready' && card === null}
      onClose={onClose}
      onStudy={() => {
        if (card) onStudy(card.id);
      }}
    />
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
