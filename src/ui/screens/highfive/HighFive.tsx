import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initialOf } from '@/domain/profile/name';
import { saveMode } from '@/domain/device/environment';
import { highFiveShortcut } from '@/domain/device/shortcuts';
import type { ReceivePlan } from '@/domain/highfive/incoming';
import { greetingProblem, greetingText } from '@/domain/highfive/text';
import { feierText, type PersonView } from '@/domain/highfive/view';
import type { GreetingManifest } from '@/domain/juri/format';
import { JuriError } from '@/domain/juri/format';
import { currentEnvironment } from '@/features/app/install';
import {
  acceptGreeting,
  acknowledge,
  deleteContact,
  give,
  prepareCard,
  prepareGreeting,
  previewGreeting,
  readGreeting,
  renameContact,
  sendFile,
} from '@/features/highfive/actions';
import { useHighFives } from '@/features/highfive/queries';
import { database } from '@/features/app/database';
import { pickFile } from '@/platform/pickFile';
import { StorageError } from '../../components/StorageError';
import { useKeys } from '../../useKeys';
import { ConfirmSheet } from '../stapel/Sheets';
import { HighFiveView, Overlay } from './HighFiveView';
import {
  CardSheet,
  ContactSheet,
  ContactsSheet,
  GreetingErrorSheet,
  GreetingSheet,
} from './HighFiveSheets';

/** Wer ein High five bekommen hat, und wofür; `kudoId` für die Gruß-Datei. */
interface Given {
  contactId?: string;
  name: string | null;
  win: string | null;
  kudoId?: string;
}

interface CardState {
  given: Given;
  file: File | null;
  url: string | null;
  alt: string;
  greeting: File | null;
  busy: boolean;
  note: { text: string; error: boolean } | null;
}

type Sheet =
  | { kind: 'contacts' }
  | { kind: 'contact'; id: string }
  | { kind: 'remove'; id: string }
  | { kind: 'greeting'; manifest: GreetingManifest; plan: ReceivePlan }
  | { kind: 'greeting-error'; message: string }
  | null;

const FAILED = 'Das hat nicht geklappt. Bitte versuche es noch einmal.';

/** High fives (`/high-fives`): geben, bekommen, Bildkarte, Gruß-Datei, Kontakte. */
export function HighFive() {
  const { model, failed } = useHighFives();
  const [given, setGiven] = useState<Given | null>(null);
  const [card, setCard] = useState<CardState | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [busy, setBusy] = useState(false);
  const [sheetFailed, setSheetFailed] = useState(false);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const urlRef = useRef<string | null>(null);
  const shareLabel = useMemo(
    () => (saveMode(currentEnvironment()) === 'share' ? 'Bild teilen' : 'Bild speichern'),
    [],
  );

  const closeCard = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setCard(null);
  }, []);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const unseen = useMemo(
    () => (model ? model.unseen.filter((r) => !dismissed.has(r.id)) : []),
    [model, dismissed],
  );

  const openGiven = useCallback((value: Given) => {
    setGiven(value);
  }, []);

  const onGive = useCallback(
    (person: PersonView) => {
      const base: Given = {
        contactId: person.id,
        name: person.name,
        win: person.win === '' ? null : person.win,
      };
      if (person.given) {
        openGiven({ ...base, ...(person.kudoId ? { kudoId: person.kudoId } : {}) });
        return;
      }
      void give(person.id, person.open ?? undefined)
        .then((kudo) => {
          openGiven({ ...base, ...(kudo ? { kudoId: kudo.id } : {}) });
        })
        .catch(() => {
          setGiven(null);
        });
    },
    [openGiven],
  );

  /** Bildkarte (und, mit Kontakt, die Gruß-Datei) entstehen, bevor jemand auf „Teilen“ tippt. */
  const openCard = useCallback((value: Given) => {
    setGiven(null);
    setCard({
      given: value,
      file: null,
      url: null,
      alt: '',
      greeting: null,
      busy: false,
      note: null,
    });
    void (async () => {
      try {
        const image = await prepareCard({
          ...(value.name ? { to: value.name } : {}),
          ...(value.win ? { win: value.win } : {}),
        });
        urlRef.current = image.url;
        const greeting = value.kudoId
          ? await database()
              .kudos.get(value.kudoId)
              .then((k) => (k ? prepareGreeting(k) : null))
          : null;
        setCard((c) =>
          c ? { ...c, file: image.file, url: image.url, alt: image.alt, greeting } : c,
        );
      } catch {
        setCard((c) => (c ? { ...c, note: { text: FAILED, error: true } } : c));
      }
    })();
  }, []);

  const send = (file: File | null) => {
    if (!file) return;
    setCard((c) => (c ? { ...c, busy: true, note: null } : c));
    sendFile(file)
      .then((outcome) => {
        const text =
          outcome === 'geteilt'
            ? 'Geteilt.'
            : outcome === 'geladen'
              ? 'Die Datei liegt in deinen Downloads.'
              : null;
        setCard((c) => (c ? { ...c, busy: false, note: text ? { text, error: false } : null } : c));
      })
      .catch(() => {
        setCard((c) => (c ? { ...c, busy: false, note: { text: FAILED, error: true } } : c));
      });
  };

  const openGreeting = useCallback(() => {
    // Der Dialog muss synchron aus dem Tippen aufgehen; die Prüfung folgt nach der Auswahl.
    void pickFile('').then(async (file) => {
      if (!file) return;
      try {
        const manifest = await readGreeting(file);
        const plan = await previewGreeting(manifest);
        const problem = greetingProblem(plan);
        setSheetFailed(false);
        setSheet(
          problem
            ? { kind: 'greeting-error', message: problem }
            : { kind: 'greeting', manifest, plan },
        );
      } catch (error) {
        setSheet({
          kind: 'greeting-error',
          message:
            error instanceof JuriError
              ? error.message
              : 'Das hat nicht geklappt. Deine Daten sind unverändert.',
        });
      }
    });
  }, []);

  // Kürzel schweigen bei offenem Sheet oder Overlay (useKeys prüft das) und in Feldern.
  useKeys((input) => {
    const action = highFiveShortcut(input);
    if (action === 'just-because') openGiven({ name: null, win: null });
    else if (action === 'open-file') openGreeting();
    else if (action === 'contacts' && model && !model.empty) setSheet({ kind: 'contacts' });
    else return false;
    return true;
  });

  if (failed) return <StorageError />;
  if (!model) return null;

  const feier = unseen.length > 0 && !given && !card ? feierText(unseen) : null;
  const contact =
    sheet?.kind === 'contact' || sheet?.kind === 'remove'
      ? model.contacts.find((c) => c.id === sheet.id)
      : undefined;

  return (
    <>
      <HighFiveView
        model={model}
        onGive={onGive}
        onJustBecause={() => {
          openGiven({ name: null, win: null });
        }}
        onContacts={() => {
          setSheet({ kind: 'contacts' });
        }}
        onOpenGreeting={openGreeting}
      />
      {given ? (
        <Overlay
          text={
            given.name
              ? `An ${given.name}${given.win ? ` für „${given.win}“` : ''}`
              : 'Einfach so. Such dir aus, an wen.'
          }
          primary="Per Nachricht senden …"
          onPrimary={() => {
            openCard(given);
          }}
          closeLabel="Schließen"
          onClose={() => {
            setGiven(null);
          }}
        />
      ) : null}
      {feier ? (
        <Overlay
          text={feier.text}
          closeLabel="Schön"
          onClose={() => {
            const ids = unseen.map((r) => r.id);
            setDismissed((d) => new Set([...d, ...ids]));
            void acknowledge(ids);
          }}
        />
      ) : null}
      {card ? (
        <CardSheet
          url={card.url}
          alt={card.alt}
          shareLabel={shareLabel}
          canGreet={card.greeting !== null}
          busy={card.busy}
          note={card.note}
          onShare={() => {
            send(card.file);
          }}
          onGreeting={() => {
            send(card.greeting);
          }}
          onClose={closeCard}
        />
      ) : null}
      {sheet?.kind === 'contacts' ? (
        <ContactsSheet
          contacts={model.contacts}
          onEdit={(id) => {
            setSheetFailed(false);
            setSheet({ kind: 'contact', id });
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {sheet?.kind === 'contact' && contact ? (
        <ContactSheet
          key={contact.id}
          contact={contact}
          busy={busy}
          failed={sheetFailed}
          onSave={(name) => {
            setBusy(true);
            renameContact(contact.id, name)
              .then(() => {
                setSheet({ kind: 'contacts' });
              })
              .catch(() => {
                setSheetFailed(true);
              })
              .finally(() => {
                setBusy(false);
              });
          }}
          onRemove={() => {
            setSheet({ kind: 'remove', id: contact.id });
          }}
          onBack={() => {
            setSheet({ kind: 'contacts' });
          }}
        />
      ) : null}
      {sheet?.kind === 'remove' && contact ? (
        <ConfirmSheet
          eyebrow="Kontakt"
          title={`${contact.name} entfernen?`}
          text="Der Kontakt und seine High fives verschwinden von diesem Gerät. Karten und Lernfortschritt bleiben."
          confirmLabel="Entfernen"
          onConfirm={async () => {
            await deleteContact(contact.id);
            setSheet(model.contacts.length > 1 ? { kind: 'contacts' } : null);
          }}
          onClose={() => {
            setSheet({ kind: 'contact', id: contact.id });
          }}
        />
      ) : null}
      {sheet?.kind === 'greeting' ? (
        <GreetingSheet
          initial={initialOf(sheet.manifest.sender.name)}
          name={sheet.manifest.sender.name}
          text={greetingText(sheet.manifest.sender.name, sheet.plan)}
          hint={
            sheet.plan.contactIsNew
              ? `${sheet.manifest.sender.name} kommt zu deinen Kontakten.`
              : null
          }
          busy={busy}
          failed={sheetFailed}
          onAccept={() => {
            const { manifest } = sheet;
            setBusy(true);
            setSheetFailed(false);
            acceptGreeting(manifest)
              .then(() => {
                setSheet(null);
              })
              .catch(() => {
                setSheetFailed(true);
              })
              .finally(() => {
                setBusy(false);
              });
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {sheet?.kind === 'greeting-error' ? (
        <GreetingErrorSheet
          message={sheet.message}
          onOpenFile={() => {
            setSheet(null);
            openGreeting();
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
    </>
  );
}
