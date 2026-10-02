import { DesktopShell } from '../../components/DesktopShell';
import { ConfirmSheet } from '../stapel/Sheets';
import {
  AREAS,
  BEARBEITEN,
  DECKS,
  ENDSPURT,
  FEHLER,
  LEER,
  LISTE,
  NEU,
  TAGS,
} from './designFixture';
import { FristenView } from './FristenView';
import { FristSheet } from './FristSheet';

export type FristenVariant =
  'liste' | 'leer' | 'endspurt' | 'neu' | 'bearbeiten' | 'fehler' | 'umfang' | 'loeschen';

const TODAY = { year: 2026, month: 9, day: 28 };
const noop = () => undefined;
const never = () => Promise.resolve();

/** Fristen mit den Beispieldaten der Designs (/styleguide/fristen/…), für den Bildvergleich. */
export function FristenVorschau({ variant }: { variant: FristenVariant }) {
  const model = variant === 'leer' ? LEER : variant === 'endspurt' ? ENDSPURT : LISTE;
  const sheet = {
    today: TODAY,
    areas: AREAS,
    decks: DECKS,
    tags: TAGS,
    onClose: noop,
    onSave: never,
  };
  return (
    <>
      <DesktopShell active="fristen">
        <FristenView model={model} onAdd={noop} onOpen={noop} onExport={noop} />
      </DesktopShell>
      {variant === 'neu' ? <FristSheet {...sheet} editing={null} initial={NEU} /> : null}
      {variant === 'bearbeiten' ? (
        <FristSheet
          {...sheet}
          editing={{ id: 'klausur', canExport: true }}
          initial={BEARBEITEN}
          onExport={() => Promise.resolve('')}
          onDelete={noop}
        />
      ) : null}
      {variant === 'fehler' ? (
        <FristSheet
          {...sheet}
          editing={null}
          initial={FEHLER}
          preview={{
            errors: {
              name: 'Gib der Frist einen Namen.',
              date: 'Das Datum liegt in der Vergangenheit.',
            },
          }}
        />
      ) : null}
      {variant === 'umfang' ? (
        <FristSheet {...sheet} editing={null} initial={BEARBEITEN} preview={{ step: 'scope' }} />
      ) : null}
      {variant === 'loeschen' ? (
        <ConfirmSheet
          eyebrow="Frist löschen"
          title="Zivilrecht, AG-Klausur löschen?"
          info={[
            ['Datum', 'Fr, 9.10.'],
            ['Umfang', 'ZR, 3 Stapel'],
            ['Karten gelöscht', '0'],
          ]}
          text="Nur die Frist verschwindet. Karten und Lernstand bleiben unverändert, die Karten laufen wieder im normalen Rhythmus."
          confirmLabel="Frist löschen"
          onConfirm={never}
          onClose={noop}
        />
      ) : null}
    </>
  );
}
