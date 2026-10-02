import { useRef, useState, type ReactNode } from 'react';
import { gestureHints } from '@/domain/device/environment';
import { currentEnvironment } from '@/features/app/install';
import { currentModifierLabel } from '@/features/app/keys';
import { formShortcut } from '@/domain/device/shortcuts';
import { useKeys } from '../../useKeys';
import {
  checkCard,
  sourceChip,
  sourceLabel,
  type CardErrors,
  type CardFields,
} from '@/domain/cards/card';
import { draftToMarkup, EMPTY_DRAFT } from '@/domain/cards/clozeDraft';
import { cardPreview } from '@/domain/cards/preview';
import type { CreateGoal } from '@/domain/cards/goal';
import { ordinals } from '@/domain/cards/occlusion';
import { formatBytes } from '@/domain/format/bytes';
import type { MediaRecord } from '@/domain/model/records';
import { isQuotaError, useBlobUrl, useMediaUrl } from '@/features/media/media';
import { Button } from '../../components/Button';
import {
  CoverSurface,
  SurfaceImage,
  SurfaceMissing,
  type SurfaceMask,
} from '../../components/CoverSurface';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileIcon,
  ImageIcon,
  TrashIcon,
} from '../../components/icons';
import { Kbd } from '../../components/Kbd';
import { plural } from '@/domain/session/present';
import { TextField } from '../../components/TextField';
import { cx } from '../../cx';
import { useMediaQuery } from '../../useMediaQuery';
import rise from '../../motion/rise.module.css';
import tap from '../../motion/tap.module.css';
import { PdfWorkspace } from '../pdf/PdfWorkspace';
import { CardPreview } from './CardPreview';
import { ClozeEditor } from './ClozeEditor';
import { CoverDrop, CoverPanel, CoverWorking } from './CoverPanel';
import { CoverEditor } from './CoverEditor';
import { ProblemSheet, SourceSheet } from './MediaSheets';
import { SchemaEditor } from './SchemaEditor';
import { EMPTY_COVER, type FormState, type Tab } from './form';
import { SplitForm } from './SplitForm';
import { useCardMedia, type MediaSeed } from './useCardMedia';
import styles from './Erstellen.module.css';

const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'qa', label: 'Frage' },
  { value: 'cloze', label: 'Lücke' },
  { value: 'schema', label: 'Schema' },
  { value: 'cover', label: 'Abdeckung' },
];

export interface CardScreenProps {
  mode: 'new' | 'edit';
  initial: FormState;
  /** „Diebstahl & Betrug · SR“; `null`, solange kein Stapel gewählt ist. */
  deckLabel: string | null;
  /** Stapel der Karte für Verknüpfungen im Schema: Kennung, Name und Rechtsgebiete („ZR, ÖR“). */
  deck?: { id: string; name: string; areaCodes: string } | null;
  /** Kennung der bearbeiteten Karte (Schema: keine Verknüpfung auf sich selbst). */
  cardId?: string;
  onPickDeck: () => void;
  /**
   * Speichert die geprüften Felder: `true` gespeichert, `false` nicht gespeichert und nichts zu
   * melden (z. B. der Stapel wird erst gewählt). Wirft, wenn das Speichern scheitert.
   */
  onSubmit: (fields: CardFields, media: MediaRecord[]) => Promise<boolean>;
  onClose: () => void;
  /** Nur beim Anlegen: Tagesziel und Meldung nach dem Speichern. */
  goal?: CreateGoal;
  toast?: ReactNode;
  /** Nur beim Bearbeiten. */
  onDelete?: () => void;
  edited?: string;
  /** Nur für Vorschauen (Bildvergleich): Zustand und Inhalte statt echter Dateien. */
  seed?: MediaSeed;
}

/**
 * Karte anlegen („Speichern & nächste“) und bearbeiten (Erstellen.dc.html, KarteBearbeiten).
 * Die Felder gehören dem Bildschirm; Speichern und Meldungen liefert der Aufrufer.
 */
export function CardScreen({
  mode,
  initial,
  deckLabel,
  deck = null,
  cardId,
  onPickDeck,
  onSubmit,
  onClose,
  goal,
  toast,
  onDelete,
  edited,
  seed,
}: CardScreenProps) {
  const editing = mode === 'edit';
  const [form, setForm] = useState<FormState>(initial);
  const [more, setMore] = useState(
    editing && (initial.norm !== '' || initial.tags !== '' || initial.note !== ''),
  );
  const [errors, setErrors] = useState<CardErrors>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const frontRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const [outline, setOutline] = useState(false);
  const set = (change: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...change }));
  };
  const media = useCardMedia(form, setForm, editing, seed);
  // Geteilte Ansicht: PDF links, Formular rechts (iPad quer, Design ab 1100 px, A8).
  const wide = useMediaQuery('(min-width: 1100px)');
  // Desktop-Gestaltung (ADR-017): alle Felder sichtbar, Vorschau der Karte, Fußleiste.
  const desktop = useMediaQuery('(min-width: 1280px)');
  const draftUrl = useBlobUrl(form.cover.draft?.record ?? null);
  const stored = useMediaUrl(form.cover.draft ? null : form.cover.mediaId);
  const coverUrl = draftUrl ?? (stored.status === 'ready' ? stored.url : null);
  const coverRatio =
    form.cover.ratio > 0
      ? form.cover.ratio
      : stored.status === 'ready' && stored.record.width && stored.record.height
        ? stored.record.width / stored.record.height
        : 1;
  const coverMissing =
    !form.cover.draft && form.cover.mediaId !== null && stored.status === 'missing';
  const hasCover = form.cover.draft !== null || form.cover.mediaId !== null;

  // Strg oder Cmd plus Eingabe speichert, auch aus einem Textfeld heraus (Desktop).
  useKeys((input) => {
    // Die Vollbild-Ansichten (Gliederung, Felder) haben ihre eigenen Kürzel.
    if (outline || media.editor) return false;
    if (formShortcut(input) !== 'save') return false;
    void submit();
    return true;
  });

  async function submit(leave = false) {
    if (busy) return;
    const { media: pending, source } = media.forSave();
    const checked = checkCard({
      type:
        form.tab === 'cloze'
          ? 'cloze'
          : form.tab === 'schema'
            ? 'schema'
            : form.tab === 'cover'
              ? 'cover'
              : 'qa',
      front: form.front,
      back: form.back,
      text: draftToMarkup(form.draft),
      title: form.title,
      points: form.points,
      mediaId: form.cover.draft?.record.id ?? form.cover.mediaId ?? undefined,
      masks: form.cover.masks,
      source,
      norm: form.norm,
      tags: form.tags,
      note: form.note,
    });
    if (!checked.ok) {
      setErrors(checked.errors);
      if (checked.errors.norm || checked.errors.note) setMore(true);
      if (checked.errors.schema) {
        if (checked.errors.schema.title) titleRef.current?.focus();
        else if (checked.errors.schema.point) setOutline(true);
        return;
      }
      (checked.errors.front ? frontRef : checked.errors.back ? backRef : textRef).current?.focus();
      return;
    }
    setErrors({});
    setFailed(false);
    setBusy(true);
    let saved: boolean;
    try {
      saved = await onSubmit(checked.fields, pending);
    } catch (error) {
      if (isQuotaError(error)) media.reportFull();
      else setFailed(true);
      setBusy(false);
      return;
    }
    setBusy(false);
    if (saved && !editing) {
      media.afterSave();
      // Nächste Karte: Inhalt, Norm und Notiz leeren, Typ, Stapel und Tags bleiben stehen.
      setForm((f) => ({
        ...f,
        front: '',
        back: '',
        draft: EMPTY_DRAFT,
        title: '',
        points: [],
        cover: EMPTY_COVER,
        norm: '',
        note: '',
      }));
      if (leave) {
        onClose();
      } else {
        (form.tab === 'cloze'
          ? textRef
          : form.tab === 'schema'
            ? titleRef
            : frontRef
        ).current?.focus();
      }
    }
  }

  if (outline) {
    return (
      <SchemaEditor
        title={form.title.trim()}
        norm={form.norm.trim()}
        areaCodes={deck?.areaCodes ?? ''}
        initial={form.points}
        pointErrors={errors.schema?.point}
        deckId={deck?.id ?? null}
        deckName={deck?.name ?? null}
        selfId={cardId}
        onSave={(points) => {
          set({ points });
          setErrors({});
          setOutline(false);
        }}
        onBack={() => {
          setOutline(false);
        }}
      />
    );
  }

  const coverImage =
    seed?.coverImage ?? (coverUrl ? <SurfaceImage src={coverUrl} /> : <SurfaceMissing />);
  const surfaceMasks: SurfaceMask[] = (() => {
    const labels = ordinals(form.cover.masks);
    return form.cover.masks.map((m) => ({
      ...m,
      label: labels.get(m.n) ?? 0,
      look: 'covered' as const,
    }));
  })();
  const draft = form.cover.draft;
  const clozePanel = (
    <div className={rise.rise}>
      <ClozeEditor
        draft={form.draft}
        onChange={(draft) => {
          set({ draft });
        }}
        error={errors.text}
        textRef={textRef}
      />
    </div>
  );
  const schemaPanel = (
    <div className={cx(styles.schemaPanel, rise.rise)}>
      <TextField
        label="Titel des Schemas"
        value={form.title}
        onChange={(title) => {
          set({ title });
        }}
        placeholder="z. B. Amtshaftungsanspruch"
        error={errors.schema?.title}
        inputRef={titleRef}
      />
      <button
        type="button"
        className={cx(styles.outlineButton, tap.tap)}
        onClick={() => {
          setOutline(true);
        }}
      >
        Gliederung bearbeiten
        <ChevronRightIcon size={18} strokeWidth={2.2} />
      </button>
      {errors.schema?.points || errors.schema?.point ? (
        <span className={styles.errorText} role="alert">
          {errors.schema.points ?? 'Bitte prüfe die markierten Punkte in der Gliederung.'}
        </span>
      ) : (
        <span className={styles.outlineInfo}>
          {form.points.length === 0
            ? 'Noch keine Punkte'
            : plural(form.points.length, 'Punkt', 'Punkte')}
        </span>
      )}
    </div>
  );
  const panels = form.tab === 'cloze' ? clozePanel : form.tab === 'schema' ? schemaPanel : null;
  const coverPanel = media.busy ? (
    <CoverWorking name={media.busy.name} size={formatBytes(media.busy.size)} />
  ) : hasCover ? (
    <CoverPanel
      preview={
        <CoverSurface ratio={coverRatio} masks={surfaceMasks} label="Vorschau der Abdeckung">
          {coverImage}
        </CoverSurface>
      }
      masks={form.cover.masks.length}
      facts={
        draft
          ? `${String(draft.record.width ?? 0)} × ${String(draft.record.height ?? 0)} · ${formatBytes(draft.record.size)}`
          : stored.status === 'ready'
            ? `${String(stored.record.width ?? 0)} × ${String(stored.record.height ?? 0)} · ${formatBytes(stored.record.size)}`
            : ''
      }
      origin={
        form.cover.page !== null
          ? `Seite ${String(form.cover.page)} aus ${media.pdf?.name ?? 'dem PDF'}`
          : draft?.resized
            ? `Verkleinert von ${String(draft.originalWidth)} × ${String(draft.originalHeight)} (${formatBytes(draft.originalSize)})`
            : form.source
              ? sourceLabel(form.source)
              : ''
      }
      onEdit={() => {
        if (form.cover.page !== null && media.pdf) {
          media.showPdf();
          media.setMode('cover');
        } else {
          media.openEditor();
        }
      }}
      onReplace={
        editing
          ? undefined
          : () => {
              media.openSourceSheet();
            }
      }
      error={errors.cover ?? (coverMissing ? 'Das Bild fehlt in diesem Backup.' : undefined)}
    />
  ) : (
    <div>
      <CoverDrop onChoose={media.openSourceSheet} />
      {errors.cover ? (
        <p className={styles.errorText} role="alert">
          {errors.cover}
        </p>
      ) : null}
    </div>
  );

  if (media.editor && hasCover) {
    return (
      <CoverEditor
        zoomNote={gestureHints(seed ? 'ios' : currentEnvironment()).zoom}
        ratio={coverRatio}
        image={coverImage}
        initial={form.cover.masks}
        onDone={(masks) => {
          setForm((f) => ({
            ...f,
            cover: {
              ...f.cover,
              masks,
              everUsed: Math.max(f.cover.everUsed, ...masks.map((m) => m.n)),
            },
          }));
          setErrors({});
          media.closeEditor();
        }}
        onBack={media.closeEditor}
      />
    );
  }

  const sheets = (
    <>
      <SourceSheet
        open={media.sourceSheet}
        onClose={media.closeSourceSheet}
        onImage={media.chooseImage}
        onPdf={() => {
          media.choosePdf('cover');
        }}
      />
      <ProblemSheet
        problem={media.problem?.problem ?? null}
        kind={media.problem?.kind ?? 'image'}
        onRetry={media.retry}
        onClose={media.dismissProblem}
      />
    </>
  );

  if (media.pdf && media.pdfOpen && !wide) {
    return (
      <>
        <PdfWorkspace
          layout="phone"
          media={media}
          cover={form.cover}
          onCover={(patch) => {
            setForm((f) => ({ ...f, cover: { ...f.cover, ...patch } }));
          }}
          onClose={media.hidePdf}
        />
        {sheets}
      </>
    );
  }

  if (media.pdf && media.pdfOpen) {
    const pdfSource =
      form.tab === 'cover' && form.cover.page !== null ? form.cover.page : media.page;
    return (
      <div className={styles.split}>
        <PdfWorkspace
          layout="pad"
          media={media}
          cover={form.cover}
          onCover={(patch) => {
            setForm((f) => ({ ...f, cover: { ...f.cover, ...patch } }));
          }}
          onClose={media.hidePdf}
        />
        <SplitForm
          form={form}
          set={set}
          errors={errors}
          onTab={(tab) => {
            setErrors({});
            if (tab === 'cover') media.setMode('cover');
            else if (media.mode === 'cover') media.setMode('text');
            set({ tab });
          }}
          made={goal?.text ?? ''}
          applied={media.applied}
          panel={panels}
          coverSummary={
            <div className={styles.splitSummary}>
              <span className={styles.splitSummaryHead}>
                <span className={styles.splitSummaryLabel}>Abdeckung</span>
                <span className={styles.splitSummaryChip}>aus PDF übernommen</span>
              </span>
              <span className={styles.splitSummaryTitle}>
                {form.cover.masks.length === 0
                  ? 'Noch keine Felder'
                  : `${String(form.cover.masks.length)} ${form.cover.masks.length === 1 ? 'Feld' : 'Felder'} auf S. ${String(pdfSource)}`}
              </span>
              <span className={styles.splitSummaryText}>
                Jedes Feld wird beim Lernen einzeln abgefragt. Ziehe links weitere Felder auf oder
                wähle ein Feld zum Verschieben.
              </span>
              {errors.cover ? (
                <span className={styles.errorText} role="alert">
                  {errors.cover}
                </span>
              ) : null}
            </div>
          }
          deckLabel={deckLabel}
          onPickDeck={onPickDeck}
          source={sourceChip({ name: media.pdf.name, page: pdfSource })}
          goal={goal ? { pct: goal.pct, text: goal.remaining } : null}
          busy={busy}
          failed={failed}
          onSave={(next) => void submit(!next)}
          frontRef={frontRef}
          backRef={backRef}
          toast={toast}
        />
        {sheets}
      </div>
    );
  }

  const mod = currentModifierLabel();
  const typePicker = editing ? (
    <div className={styles.typeFixed}>
      <span>Kartentyp</span>
      <span className={styles.typeFixedValue}>{TABS.find((t) => t.value === form.tab)?.label}</span>
    </div>
  ) : (
    <div className={styles.types} role="group" aria-label="Kartentyp">
      {TABS.map((t) => (
        <button
          key={t.value}
          type="button"
          className={cx(styles.type, tap.tap, form.tab === t.value && styles.typeOn)}
          aria-pressed={form.tab === t.value}
          onClick={() => {
            setErrors({});
            set({ tab: t.value });
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
  const qaFields =
    form.tab === 'qa' ? (
      <div className={cx(styles.fields, rise.rise)}>
        <TextField
          label="Vorderseite"
          multiline
          rows={desktop ? 2 : 3}
          value={form.front}
          onChange={(front) => {
            set({ front });
          }}
          placeholder="Frage, z. B. Was ist Gewahrsam?"
          error={errors.front}
          inputRef={frontRef}
          inputStyle={{ fontSize: 'var(--front-size, 18px)', lineHeight: 1.4 }}
          className={styles.qaField}
        />
        <TextField
          label="Rückseite"
          multiline
          rows={desktop ? 3 : 4}
          value={form.back}
          onChange={(back) => {
            set({ back });
          }}
          placeholder="Antwort"
          error={errors.back}
          inputRef={backRef}
          inputStyle={{ fontSize: 'var(--back-size, 17px)', lineHeight: 1.45 }}
          className={cx(styles.qaField, styles.qaBack)}
        />
      </div>
    ) : null;
  const typePanel =
    form.tab === 'cloze' ? (
      clozePanel
    ) : form.tab === 'schema' ? (
      schemaPanel
    ) : form.tab === 'cover' ? (
      <div className={rise.rise}>{coverPanel}</div>
    ) : null;
  const normField = (
    <label className={styles.mini}>
      <span className={styles.miniLabel}>Norm</span>
      <input
        className={styles.miniInput}
        value={form.norm}
        onChange={(e) => {
          set({ norm: e.target.value });
        }}
        placeholder="§ 242 StGB"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={errors.norm ? true : undefined}
      />
      {errors.norm ? (
        <span className={styles.errorText} role="alert">
          {errors.norm}
        </span>
      ) : null}
    </label>
  );
  const tagsField = (
    <label className={styles.mini}>
      <span className={styles.miniLabel}>Tags</span>
      <input
        className={styles.miniInput}
        value={form.tags}
        onChange={(e) => {
          set({ tags: e.target.value });
        }}
        placeholder="#Klausur #AG"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
      />
    </label>
  );
  const mediaButtons = editing ? null : (
    <div className={styles.media}>
      <button
        type="button"
        className={cx(styles.mediaButton, tap.tap)}
        onClick={() => {
          if (media.pdf) media.showPdf();
          else media.choosePdf('text');
        }}
      >
        <FileIcon size={18} />
        PDF
      </button>
      <button type="button" className={cx(styles.mediaButton, tap.tap)} onClick={media.chooseImage}>
        <ImageIcon size={18} />
        Foto / Bild
      </button>
    </div>
  );
  const sourceRows = (
    <>
      {media.pdf && !editing ? (
        <div className={styles.sourceRow}>
          <span className={styles.sourceText}>
            Quelle: {media.pdf.name}, S. {media.page}
          </span>
          <button type="button" className={styles.sourceButton} onClick={media.showPdf}>
            Öffnen
          </button>
          <button type="button" className={styles.sourceButton} onClick={media.removePdf}>
            Entfernen
          </button>
        </div>
      ) : null}
      {editing && form.source ? (
        <div className={styles.sourceRow}>
          <span className={styles.sourceText}>Quelle: {sourceLabel(form.source)}</span>
        </div>
      ) : null}
    </>
  );
  const deckLabelText = `Stapel: ${deckLabel ?? 'noch keiner gewählt'}. Ändern`;
  const editedNote = edited ? <p className={styles.note}>{edited}</p> : null;
  const preview = cardPreview({
    kind: form.tab,
    front: form.front,
    back: form.back,
    cloze: draftToMarkup(form.draft),
    title: form.title,
    points: form.points,
  });
  const previewPane = desktop ? (
    <CardPreview
      preview={preview}
      area={deck?.areaCodes ?? ''}
      norm={form.norm.trim()}
      empty={
        form.tab === 'qa'
          ? { front: 'Vorderseite', back: 'Rückseite' }
          : form.tab === 'cloze'
            ? { front: 'Text mit Lücken', back: 'Text mit Lücken' }
            : { front: 'Titel des Schemas', back: 'Punkte der Gliederung' }
      }
      cover={
        form.tab === 'cover'
          ? {
              front: (
                <CoverSurface ratio={coverRatio} masks={surfaceMasks} label="Vorderseite">
                  {coverImage}
                </CoverSurface>
              ),
              back: (
                <CoverSurface
                  ratio={coverRatio}
                  masks={surfaceMasks.map((m) => ({ ...m, look: 'revealed' as const }))}
                  label="Rückseite"
                >
                  {coverImage}
                </CoverSurface>
              ),
            }
          : undefined
      }
    />
  ) : null;

  return (
    <main className={styles.screen}>
      <div className={styles.top}>
        <button type="button" className={styles.topLink} onClick={onClose}>
          <ChevronLeftIcon size={24} strokeWidth={2.2} className={styles.topIcon} />
          {editing ? 'Abbrechen' : 'Schließen'}
        </button>
        <h1 className={styles.topTitle}>{editing ? 'Karte bearbeiten' : 'Neue Karte'}</h1>
        <button
          type="button"
          className={cx(styles.more, tap.tap)}
          aria-pressed={more}
          onClick={() => {
            setMore(!more);
          }}
        >
          {more ? 'Einfach' : 'Mehr'}
        </button>
        {desktop && goal ? <span className={styles.chip}>{goal.text}</span> : null}
      </div>

      {desktop ? (
        <div className={styles.body}>
          <div className={styles.formCol}>
            {typePicker}
            {qaFields}
            {typePanel}
            {mediaButtons}
            {sourceRows}
            <div className={styles.minis}>
              {normField}
              <button
                type="button"
                className={cx(styles.mini, styles.miniButton)}
                onClick={onPickDeck}
                aria-label={deckLabelText}
              >
                <span className={styles.miniLabel}>Stapel</span>
                <span className={styles.miniValue}>{deckLabel ?? 'Stapel wählen'}</span>
              </button>
              {tagsField}
            </div>
            <TextField
              label="Notiz"
              multiline
              rows={2}
              value={form.note}
              onChange={(note) => {
                set({ note });
              }}
              placeholder="Eigene Notiz, erscheint beim Lernen unter der Antwort"
              error={errors.note}
              className={styles.noteField}
            />
            {editedNote}
          </div>
          {previewPane}
        </div>
      ) : (
        <>
          {typePicker}
          {qaFields}
          {typePanel}
          {more ? (
            <div className={cx(styles.extra, rise.rise)}>
              {normField}
              {tagsField}
              <label className={styles.mini}>
                <span className={styles.miniLabel}>Notiz</span>
                <textarea
                  className={cx(styles.miniInput, styles.miniArea)}
                  value={form.note}
                  onChange={(e) => {
                    set({ note: e.target.value });
                  }}
                  placeholder="Merksatz, Eselsbrücke oder Fundstelle. Erscheint beim Lernen unter der Antwort."
                  rows={3}
                  aria-invalid={errors.note ? true : undefined}
                />
                {errors.note ? (
                  <span className={styles.errorText} role="alert">
                    {errors.note}
                  </span>
                ) : null}
              </label>
            </div>
          ) : null}
          {mediaButtons}
          {sourceRows}
          <button
            type="button"
            className={styles.deckRow}
            onClick={onPickDeck}
            aria-label={deckLabelText}
          >
            <span className={styles.deckLabel}>Stapel</span>
            <span className={styles.deckValue}>
              {deckLabel ?? 'Stapel wählen'}
              <ChevronRightIcon size={16} />
            </span>
          </button>
          {editedNote}
        </>
      )}

      <div className={styles.footer}>
        {goal ? (
          <div className={styles.goal}>
            <div className={styles.goalTrack} aria-hidden="true">
              <div className={styles.goalFill} style={{ width: `${goal.pct}%` }} />
            </div>
            <span>{desktop ? goal.remaining : goal.text}</span>
          </div>
        ) : null}
        {editing && onDelete && desktop ? (
          <button type="button" className={styles.delete} onClick={onDelete}>
            <TrashIcon size={18} />
            Karte löschen
          </button>
        ) : null}
        {failed ? (
          <p className={styles.failed} role="alert">
            Das hat nicht geklappt. Bitte versuche es noch einmal.
          </p>
        ) : null}
        <div className={styles.actions}>
          {desktop && !editing ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                void submit(true);
              }}
            >
              Speichern
            </Button>
          ) : null}
          <Button
            block
            disabled={busy}
            aria-keyshortcuts="Control+Enter Meta+Enter"
            onClick={() => void submit()}
          >
            {editing ? 'Speichern' : 'Speichern & nächste'}
            <Kbd tone="dark">{mod} ↵</Kbd>
          </Button>
        </div>
        {editing && onDelete && !desktop ? (
          <button type="button" className={styles.delete} onClick={onDelete}>
            <TrashIcon size={18} />
            Karte löschen
          </button>
        ) : null}
      </div>
      {toast}
      {sheets}
    </main>
  );
}
