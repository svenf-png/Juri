import { AppShell } from '../../components/AppShell';
import {
  ANY_TEXT,
  CONTACTS,
  FEIER_TEXT,
  GIVEN_TEXT,
  GREETING_ERROR,
  GREETING_HINT,
  GREETING_TEXT,
  MARA_CONTACT,
  PREVIEW_URL,
  givenModel,
  leerModel,
  listModel,
} from './designFixture';
import { HighFiveView, Overlay } from './HighFiveView';
import {
  CardSheet,
  ContactSheet,
  ContactsSheet,
  GreetingErrorSheet,
  GreetingSheet,
} from './HighFiveSheets';

export type HighFiveVariant =
  | 'liste'
  | 'ipad'
  | 'leer'
  | 'gegeben'
  | 'einfach'
  | 'feier'
  | 'karte'
  | 'kontakte'
  | 'kontakt'
  | 'gruss'
  | 'fehler';

const noop = () => undefined;

/** High fives mit den Beispieldaten der Artboards (/styleguide/high-fives/…), für den Bildvergleich. */
export function HighFiveVorschau({ variant }: { variant: HighFiveVariant }) {
  const model = variant === 'leer' ? leerModel : variant === 'gegeben' ? givenModel : listModel;
  return (
    <AppShell active="erfolge" pushed={variant !== 'ipad'}>
      <HighFiveView
        model={model}
        onGive={noop}
        onJustBecause={noop}
        onContacts={noop}
        onOpenGreeting={noop}
      />
      {variant === 'gegeben' || variant === 'einfach' ? (
        <Overlay
          text={variant === 'gegeben' ? GIVEN_TEXT : ANY_TEXT}
          primary="Per Nachricht senden …"
          onPrimary={noop}
          closeLabel="Schließen"
          onClose={noop}
        />
      ) : null}
      {variant === 'feier' ? <Overlay text={FEIER_TEXT} closeLabel="Schön" onClose={noop} /> : null}
      {variant === 'karte' ? (
        <CardSheet
          url={PREVIEW_URL}
          alt="Bildkarte"
          shareLabel="Bild teilen"
          canGreet
          busy={false}
          note={null}
          onShare={noop}
          onGreeting={noop}
          onClose={noop}
        />
      ) : null}
      {variant === 'kontakte' ? (
        <ContactsSheet contacts={CONTACTS} onEdit={noop} onClose={noop} />
      ) : null}
      {variant === 'kontakt' ? (
        <ContactSheet
          contact={MARA_CONTACT}
          busy={false}
          failed={false}
          onSave={noop}
          onRemove={noop}
          onBack={noop}
        />
      ) : null}
      {variant === 'gruss' ? (
        <GreetingSheet
          initial="M"
          name="Mara"
          text={GREETING_TEXT}
          hint={GREETING_HINT}
          busy={false}
          failed={false}
          onAccept={noop}
          onClose={noop}
        />
      ) : null}
      {variant === 'fehler' ? (
        <GreetingErrorSheet message={GREETING_ERROR} onOpenFile={noop} onClose={noop} />
      ) : null}
    </AppShell>
  );
}
