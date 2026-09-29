import { useState } from 'react';
import { deadlineFacts } from '@/domain/deadlines/list';
import { deadlinesShortcut } from '@/domain/device/shortcuts';
import { draftOf, newDraft } from '@/domain/deadlines/form';
import {
  addDeadline,
  changeDeadline,
  exportDeadlines,
  removeDeadline,
  type ExportOutcome,
} from '@/features/deadlines/actions';
import { useDeadlines } from '@/features/deadlines/queries';
import { StorageError } from '../../components/StorageError';
import { useKeys } from '../../useKeys';
import { ConfirmSheet } from '../stapel/Sheets';
import { FristenView } from './FristenView';
import { FristSheet, type FristValue } from './FristSheet';

type Open = { kind: 'new' } | { kind: 'edit'; id: string } | { kind: 'delete'; id: string } | null;

function exportMessage(outcome: ExportOutcome): string {
  switch (outcome) {
    case 'geteilt':
      return 'Kalenderdatei geteilt.';
    case 'geladen':
      return 'Kalenderdatei geladen. Öffne sie, um die Termine zu übernehmen.';
    case 'nichts':
      return 'Es gibt keine kommende Frist mit Datum.';
    case 'abgebrochen':
      return '';
  }
}

async function exportWithMessage(ids?: readonly string[]): Promise<string> {
  try {
    return exportMessage(await exportDeadlines(ids));
  } catch {
    return 'Das hat nicht geklappt. Bitte versuche es noch einmal.';
  }
}

/** Fristen (`/fristen`): Liste, Anlegen und Bearbeiten im Sheet, Löschen mit Bestätigung, .ics-Export. */
export function Fristen() {
  const { model, snapshot, today, failed } = useDeadlines();
  const [open, setOpen] = useState<Open>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);

  useKeys((input) => {
    if (deadlinesShortcut(input) !== 'new-deadline') return false;
    setOpen({ kind: 'new' });
    return true;
  });

  if (failed) return <StorageError />;
  if (!model || !snapshot) return null;

  const close = () => {
    setOpen(null);
  };
  const current =
    open && open.kind !== 'new' ? snapshot.deadlines.find((d) => d.id === open.id) : undefined;
  const card = current ? model.cards.find((c) => c.id === current.id) : undefined;
  const save = async (value: FristValue) => {
    if (open?.kind === 'edit') await changeDeadline(open.id, value);
    else await addDeadline(value);
    close();
  };
  const exportable = card?.status.phase === 'upcoming' || card?.status.phase === 'sprint';
  const sheetProps = {
    today,
    areas: snapshot.areas,
    decks: snapshot.decks,
    tags: snapshot.tags,
    onClose: close,
  };

  return (
    <>
      <FristenView
        model={model}
        onAdd={() => {
          setOpen({ kind: 'new' });
        }}
        onOpen={(id) => {
          setExportNote(null);
          setOpen({ kind: 'edit', id });
        }}
        onExport={() => {
          void exportWithMessage().then(setExportNote);
        }}
        exportNote={exportNote}
      />
      {open?.kind === 'new' ? (
        <FristSheet {...sheetProps} editing={null} initial={newDraft()} onSave={save} />
      ) : null}
      {open?.kind === 'edit' && current ? (
        <FristSheet
          {...sheetProps}
          key={current.id}
          editing={{ id: current.id, canExport: exportable }}
          initial={draftOf(current)}
          keepDate={current.date}
          onSave={save}
          onDelete={() => {
            setOpen({ kind: 'delete', id: current.id });
          }}
          onExport={() => exportWithMessage([current.id])}
        />
      ) : null}
      {open?.kind === 'delete' && current && card ? (
        <ConfirmSheet
          eyebrow="Frist löschen"
          title={`${current.name} löschen?`}
          info={(() => {
            const facts = deadlineFacts(
              current,
              card.status,
              snapshot.areas,
              snapshot.decks,
              today,
            );
            return [
              ['Datum', facts.date],
              ['Umfang', facts.scope],
              ['Karten gelöscht', '0'],
            ];
          })()}
          text="Nur die Frist verschwindet. Karten und Lernstand bleiben unverändert, die Karten laufen wieder im normalen Rhythmus."
          confirmLabel="Frist löschen"
          onConfirm={async () => {
            await removeDeadline(current.id);
            close();
          }}
          onClose={close}
        />
      ) : null}
    </>
  );
}
