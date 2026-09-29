import { shareCopy } from '@/domain/juri/text';
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
  return (
    <>
      <TeilenView
        export={part.export}
        incoming={part.incoming}
        onPickDecks={noop}
        onToggleNotes={noop}
        onToggleAchievements={noop}
        onSend={noop}
        onOpenFile={noop}
        onHelp={noop}
        onMode={noop}
        onImport={noop}
      />
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
