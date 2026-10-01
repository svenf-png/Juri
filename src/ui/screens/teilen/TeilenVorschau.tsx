import { shareCopy } from '@/domain/juri/text';
import { DesktopShell } from '../../components/DesktopShell';
import { useMediaQuery } from '../../useMediaQuery';
import {
  AREAS,
  CARD_COUNTS,
  CONFLICTS,
  DECKS,
  EMPTY_EXPORT,
  ERROR,
  IDLE,
  PREVIEW,
  READY,
  SUMMARY,
} from './designFixture';
import { ConflictSheet, DeckShareSheet, GuideSheet, ImportedSheet } from './TeilenSheets';
import { TeilenView, type ExportModel, type IncomingModel } from './TeilenView';

export type TeilenVariant =
  'bereit' | 'import' | 'stapel' | 'konflikt' | 'fehler' | 'leer' | 'erfolg' | 'anleitung';

const noop = () => undefined;

const PARTS: Record<TeilenVariant, { export: ExportModel; incoming: IncomingModel }> = {
  bereit: { export: READY, incoming: IDLE },
  import: { export: READY, incoming: PREVIEW },
  stapel: { export: READY, incoming: IDLE },
  konflikt: { export: READY, incoming: PREVIEW },
  fehler: { export: READY, incoming: ERROR },
  leer: { export: EMPTY_EXPORT, incoming: IDLE },
  erfolg: { export: READY, incoming: IDLE },
  anleitung: { export: READY, incoming: IDLE },
};

/** Teilen mit den Beispieldaten der Artboards (/styleguide/teilen/…), für den Bildvergleich. */
export function TeilenVorschau({ variant }: { variant: TeilenVariant }) {
  const part = PARTS[variant];
  // Ab 1280 px gelten Beschriftung und Hinweis für den Rechner (A52): Herunterladen statt Teilen-Menü.
  const desktop = useMediaQuery('(min-width: 1280px)');
  const copy = shareCopy('desktop');
  const exported =
    desktop && part.export.kind === 'ready' ? { ...part.export, action: copy.action } : part.export;
  const incoming =
    desktop && part.incoming.kind === 'idle'
      ? { ...part.incoming, hint: copy.receiveHint }
      : part.incoming;
  return (
    <>
      <DesktopShell active="teilen">
        <TeilenView
          export={exported}
          incoming={incoming}
          onPickDecks={noop}
          onToggleNotes={noop}
          onToggleAchievements={noop}
          onSend={noop}
          onOpenFile={noop}
          onHelp={noop}
          onMode={noop}
          onImport={noop}
        />
      </DesktopShell>
      {variant === 'stapel' ? (
        <DeckShareSheet
          areas={AREAS}
          decks={DECKS}
          cardCounts={CARD_COUNTS}
          selected={['amt']}
          onToggle={noop}
          onClose={noop}
        />
      ) : null}
      {variant === 'konflikt' ? (
        <ConflictSheet
          conflicts={CONFLICTS}
          busy={false}
          failed={false}
          onDecide={noop}
          onConfirm={noop}
          onClose={noop}
        />
      ) : null}
      {variant === 'erfolg' ? (
        <ImportedSheet summary={SUMMARY} onOpenDeck={noop} onClose={noop} />
      ) : null}
      {variant === 'anleitung' ? (
        <GuideSheet copy={shareCopy('ios')} onOpenFile={noop} onClose={noop} />
      ) : null}
    </>
  );
}
