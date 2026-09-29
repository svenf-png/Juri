import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { shareShortcut } from '@/domain/device/shortcuts';
import type { JuriPackage } from '@/domain/juri/format';
import type { Conflict, MergePlan, MergeSummary, Resolution } from '@/domain/juri/merge';
import {
  COPY_HINT,
  NOTHING_TO_IMPORT,
  describeIncoming,
  exportSummary,
  firstDeckId,
  shareCopy,
  updateHint,
} from '@/domain/juri/text';
import { deckLabel } from '@/domain/library/library';
import { currentEnvironment } from '@/features/app/install';
import { useShareSnapshot } from '@/features/share/queries';
import {
  commitIncoming,
  incomingErrorMessage,
  planIncoming,
  prepareExport,
  readIncoming,
  sendExport,
  writeShareAchievements,
  type PreparedExport,
} from '@/features/share/share';
import { pickFile } from '@/platform/pickFile';
import { StorageError } from '../../components/StorageError';
import { useKeys } from '../../useKeys';
import { ConflictSheet, DeckShareSheet, GuideSheet, ImportedSheet } from './TeilenSheets';
import { TeilenView, type ImportMode, type IncomingModel, type ExportModel } from './TeilenView';

type Incoming =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | {
      kind: 'preview';
      pack: JuriPackage;
      mode: ImportMode;
      plan: MergePlan;
      decisions: ReadonlyMap<string, Resolution>;
    };

type Open = 'decks' | 'guide' | 'conflicts' | null;

interface Prepared {
  key: string;
  value: PreparedExport | null;
  failed: boolean;
}

const SEND_FAILED = 'Das hat nicht geklappt. Bitte versuche es noch einmal.';

/** Teilen und Import (`/teilen`): Stapel als `.juri` weitergeben, Dateien prüfen und einspielen. */
export function Teilen() {
  const { snapshot, failed } = useShareSnapshot();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const copy = useMemo(() => shareCopy(currentEnvironment()), []);

  const [picked, setPicked] = useState<string[] | null>(null);
  const [notes, setNotes] = useState(false);
  const [achievementsOverride, setAchievements] = useState<boolean | null>(null);
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const [incoming, setIncoming] = useState<Incoming>({ kind: 'idle' });
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState(false);
  const [importFailed, setImportFailed] = useState(false);
  const [imported, setImported] = useState<{
    summary: MergeSummary;
    deckId: string | undefined;
  } | null>(null);

  const decks = snapshot?.library.decks;
  const query = params.get('stapel');
  // Auswahl: was gewählt wurde, sonst der Stapel aus dem Link, sonst der zuletzt geänderte.
  const deckIds = useMemo(() => {
    if (!decks) return [];
    const exists = (id: string) => decks.some((d) => d.id === id);
    if (picked) return picked.filter(exists);
    if (query && exists(query)) return [query];
    const newest = [...decks].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    return newest ? [newest.id] : [];
  }, [decks, picked, query]);
  const achievements = achievementsOverride ?? snapshot?.achievements ?? true;
  const key = JSON.stringify([deckIds, notes, achievements]);

  useEffect(() => {
    if (!snapshot || deckIds.length === 0) return undefined;
    let cancelled = false;
    prepareExport({ deckIds, notes, achievements })
      .then((value) => {
        if (!cancelled) setPrepared({ key, value, failed: false });
      })
      .catch(() => {
        if (!cancelled) setPrepared({ key, value: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot, key, deckIds, notes, achievements]);

  const ready = prepared?.key === key ? prepared : null;
  const preparedFile = ready?.value ?? null;

  const send = useCallback(() => {
    if (!preparedFile) return;
    setNote(null);
    sendExport(preparedFile)
      .then((outcome) => {
        if (outcome === 'geteilt') setNote({ text: copy.shared, error: false });
        if (outcome === 'geladen') setNote({ text: copy.saved, error: false });
      })
      .catch(() => {
        setNote({ text: SEND_FAILED, error: true });
      });
  }, [preparedFile, copy]);

  const openFile = useCallback(() => {
    setOpen(null);
    // Der Dialog muss synchron aus dem Tippen aufgehen; die Prüfung folgt nach der Auswahl (A10).
    void pickFile('').then(async (file) => {
      if (!file) return;
      try {
        const pack = await readIncoming(file);
        const plan = await planIncoming(pack, 'update');
        setImportFailed(false);
        setIncoming({ kind: 'preview', pack, mode: 'update', plan, decisions: new Map() });
      } catch (error) {
        setIncoming({ kind: 'error', message: incomingErrorMessage(error) });
      }
    });
  }, []);

  useKeys((input) => {
    const action = shareShortcut(input);
    if (action === 'open-file') openFile();
    else if (action === 'send' && preparedFile) send();
    else return false;
    return true;
  });

  if (failed) return <StorageError />;
  if (!snapshot) return null;

  const { areas, cardCounts } = snapshot.library;
  const hasDecks = snapshot.library.decks.length > 0;

  const exportModel: ExportModel = !hasDecks
    ? { kind: 'empty' }
    : {
        kind: 'ready',
        fileName: preparedFile?.file.name ?? '…',
        summary: preparedFile
          ? exportSummary(preparedFile.stats, preparedFile.file.size)
          : ready?.failed
            ? 'Datei konnte nicht erstellt werden'
            : deckIds.length === 0
              ? 'Wähle einen Stapel'
              : 'Wird vorbereitet …',
        deckLabel: (() => {
          const chosen = snapshot.library.decks.filter((d) => deckIds.includes(d.id));
          if (chosen.length === 0) return '';
          const [first] = chosen;
          return chosen.length === 1 && first
            ? deckLabel(first, areas)
            : `${String(chosen.length)} Stapel`;
        })(),
        notes,
        achievements,
        action: copy.action,
        canSend: preparedFile !== null,
        note:
          note ??
          (preparedFile && preparedFile.skipped > 0
            ? {
                text: `${String(preparedFile.skipped)} Abdeckungen ohne Bild bleiben draußen.`,
                error: false,
              }
            : null),
      };

  let incomingModel: IncomingModel;
  if (incoming.kind === 'preview') {
    const { plan, pack, mode } = incoming;
    incomingModel = {
      kind: 'preview',
      view: describeIncoming(pack),
      mode,
      updateHint: updateHint(plan.summary),
      copyHint: COPY_HINT,
      nothing: mode === 'update' && plan.empty ? NOTHING_TO_IMPORT : null,
      busy,
    };
  } else if (incoming.kind === 'error') {
    incomingModel = { kind: 'error', message: incoming.message };
  } else {
    incomingModel = { kind: 'idle', hint: copy.receiveHint };
  }

  const changeMode = (mode: ImportMode) => {
    if (incoming.kind !== 'preview' || incoming.mode === mode) return;
    const { pack } = incoming;
    void planIncoming(pack, mode).then((plan) => {
      setIncoming({ kind: 'preview', pack, mode, plan, decisions: new Map() });
    });
  };

  const commit = () => {
    if (incoming.kind !== 'preview' || busy) return;
    const { pack, mode, decisions } = incoming;
    setBusy(true);
    setImportFailed(false);
    commitIncoming(pack, mode, decisions)
      .then((plan) => {
        setOpen(null);
        setIncoming({ kind: 'idle' });
        setImported({ summary: plan.summary, deckId: firstDeckId(pack, plan) });
      })
      .catch(() => {
        setImportFailed(true);
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const startImport = () => {
    if (incoming.kind !== 'preview') return;
    if (incoming.plan.conflicts.length > 0) setOpen('conflicts');
    else commit();
  };

  const conflicts: Conflict[] =
    incoming.kind === 'preview'
      ? incoming.plan.conflicts.map((c) => ({
          ...c,
          resolution: incoming.decisions.get(c.cardId) ?? 'mine',
        }))
      : [];

  return (
    <>
      <TeilenView
        export={exportModel}
        incoming={incomingModel}
        onPickDecks={() => {
          setOpen('decks');
        }}
        onToggleNotes={() => {
          setNotes(!notes);
        }}
        onToggleAchievements={() => {
          setAchievements(!achievements);
          void writeShareAchievements(!achievements);
        }}
        onSend={send}
        onOpenFile={openFile}
        onHelp={() => {
          setOpen('guide');
        }}
        onMode={changeMode}
        onImport={startImport}
      />
      {open === 'decks' ? (
        <DeckShareSheet
          areas={areas}
          decks={snapshot.library.decks}
          cardCounts={cardCounts}
          selected={deckIds}
          onToggle={(id) => {
            setNote(null);
            setPicked(deckIds.includes(id) ? deckIds.filter((d) => d !== id) : [...deckIds, id]);
          }}
          onClose={() => {
            setOpen(null);
          }}
        />
      ) : null}
      {open === 'guide' ? (
        <GuideSheet
          copy={copy}
          onOpenFile={openFile}
          onClose={() => {
            setOpen(null);
          }}
        />
      ) : null}
      {open === 'conflicts' && incoming.kind === 'preview' ? (
        <ConflictSheet
          conflicts={conflicts}
          busy={busy}
          failed={importFailed}
          onDecide={(cardId, resolution) => {
            setIncoming({
              ...incoming,
              decisions: new Map([...incoming.decisions, [cardId, resolution]]),
            });
          }}
          onConfirm={commit}
          onClose={() => {
            setOpen(null);
          }}
        />
      ) : null}
      {imported ? (
        <ImportedSheet
          summary={imported.summary}
          onOpenDeck={() => {
            const id = imported.deckId;
            setImported(null);
            void navigate(id ? `/stapel/${id}` : '/stapel');
          }}
          onClose={() => {
            setImported(null);
          }}
        />
      ) : null}
    </>
  );
}
