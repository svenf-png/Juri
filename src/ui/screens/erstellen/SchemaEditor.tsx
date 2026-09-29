import { useEffect, useRef, useState } from 'react';
import { checkCard } from '@/domain/cards/card';
import {
  addPoint,
  canAddPoint,
  canIndent,
  canMove,
  canOutdent,
  indentPoint,
  movePoint,
  outdentPoint,
  pointLabels,
  pointPaths,
  removePoint,
  updatePoint,
  type DraftPoint,
} from '@/domain/cards/schema';
import { linkServices, type LinkServices } from '@/features/library/links';
import { Button } from '../../components/Button';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  IndentIcon,
  LinkIcon,
  OutdentIcon,
  PlusIcon,
  SearchIcon,
} from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { cx } from '../../cx';
import tap from '../../motion/tap.module.css';
import { useKeyboardOpen } from '../../useKeyboardOpen';
import styles from './SchemaEditor.module.css';

export interface SchemaEditorProps {
  /** Titel und Kopfzeile stammen aus dem Karten-Formular. */
  title: string;
  /** „§ 839 BGB i. V. m. Art. 34 GG“ und „ZR, ÖR“; leere Teile entfallen. */
  norm: string;
  areaCodes: string;
  initial: readonly DraftPoint[];
  /** Fehler je Punkt (Kennung), nach einem Speichern mit ungültigen Punkten. */
  pointErrors?: Readonly<Record<string, string>> | undefined;
  /** Stapel für „Neue Karte anlegen“; `null`, solange keiner gewählt ist. */
  deckId: string | null;
  deckName: string | null;
  /** Kennung der bearbeiteten Karte, damit sie sich nicht selbst verknüpft. */
  selfId?: string | undefined;
  onSave: (points: DraftPoint[]) => void;
  onBack: () => void;
  /** Zugriff auf Karten für Verknüpfungen; ohne Angabe die Datenbank (Vorschau und Tests setzen eigene). */
  services?: LinkServices;
  /** Nur Vorschau und Tests: Auswahl und geöffnetes Sheet beim Start. */
  start?: { selected?: number | null; sheet?: Sheets; query?: string; creating?: boolean };
}

export type Sheets = 'point' | 'link' | 'discard' | null;

/**
 * Schema-Editor (SchemaEditor.dc.html): Gliederung antippen (wählt), nochmal antippen (Sheet zum
 * Bearbeiten), unten hinzufügen, ein- und ausrücken und verknüpfen. Änderungen gelten erst mit
 * „Sichern“; „Zurück“ fragt nach, wenn etwas geändert wurde.
 */
export function SchemaEditor({
  title,
  norm,
  areaCodes,
  initial,
  pointErrors,
  deckId,
  deckName,
  selfId,
  onSave,
  onBack,
  services = linkServices,
  start,
}: SchemaEditorProps) {
  const [points, setPoints] = useState<DraftPoint[]>([...initial]);
  const [selected, setSelected] = useState<number | null>(start?.selected ?? null);
  const [sheet, setSheet] = useState<Sheets>(start?.sheet ?? null);
  const changed = useRef(false);
  const labels = pointLabels(points);
  const paths = pointPaths(points);
  const sub = [norm, areaCodes].filter((t) => t !== '').join(' · ');
  const sel = selected === null ? undefined : points[selected];

  const change = (next: DraftPoint[], index: number | null = selected) => {
    changed.current = true;
    setPoints(next);
    setSelected(index);
  };

  const add = () => {
    const out = addPoint(points, selected);
    change(out.points, out.index);
    setSheet('point');
  };

  const back = () => {
    if (changed.current) setSheet('discard');
    else onBack();
  };

  return (
    <main className={styles.screen}>
      <div className={styles.top}>
        <button type="button" className={styles.back} onClick={back}>
          <ChevronLeftIcon size={24} strokeWidth={2.2} />
          Zurück
        </button>
        <h1 className={styles.topTitle}>Schema</h1>
        <button
          type="button"
          className={cx(styles.save, tap.tap)}
          onClick={() => {
            onSave(points);
          }}
        >
          Sichern
        </button>
      </div>
      <div className={cx(styles.title, title === '' && styles.titleEmpty)}>
        {title === '' ? 'Titel fehlt noch' : title}
      </div>
      {sub !== '' ? <div className={styles.sub}>{sub}</div> : null}

      {points.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyTitle}>Noch keine Punkte</span>
          <span className={styles.emptyText}>
            Lege die Gliederung Punkt für Punkt an. Mit Einrücken bildest du Unterpunkte (a, aa).
          </span>
          <button type="button" className={cx(styles.emptyAction, tap.tap)} onClick={add}>
            Ersten Punkt hinzufügen
          </button>
        </div>
      ) : (
        <>
          <ol className={styles.list} role="list" aria-label="Gliederung">
            {points.map((point, i) => {
              const on = selected === i;
              const error = pointErrors?.[point.id];
              return (
                <li key={point.id}>
                  <div
                    className={cx(
                      styles.row,
                      point.level > 1 && styles.rowNested,
                      point.level > 2 && styles.rowDeep,
                      on && styles.rowOn,
                    )}
                  >
                    <button
                      type="button"
                      className={styles.main}
                      aria-current={on ? 'true' : undefined}
                      aria-label={`${labels[i] ?? ''} ${point.text || 'Punkt ohne Text'}${on ? ', bearbeiten' : ''}`}
                      onClick={() => {
                        if (on) setSheet('point');
                        else setSelected(i);
                      }}
                    >
                      <span className={styles.label} aria-hidden="true">
                        {labels[i]}
                      </span>
                      <span className={cx(styles.text, point.text === '' && styles.textEmpty)}>
                        {point.text === '' ? 'Punkt ohne Text' : point.text}
                      </span>
                      {point.norm !== '' ? <span className={styles.norm}>{point.norm}</span> : null}
                    </button>
                    {on || point.link !== null ? (
                      <button
                        type="button"
                        className={cx(styles.chip, on && styles.chipOn)}
                        onClick={() => {
                          setSelected(i);
                          setSheet('link');
                        }}
                        aria-label={
                          point.link === null ? 'Mit Karte verknüpfen' : 'Verknüpfte Karte ändern'
                        }
                      >
                        <LinkIcon size={12} strokeWidth={2.6} />
                        {point.link === null ? 'verknüpfen' : 'Karte'}
                      </button>
                    ) : null}
                  </div>
                  {error ? (
                    <p className={styles.rowError} role="alert">
                      {error}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {selected === null ? (
            <p className={styles.hint}>
              Punkt antippen zum Auswählen, nochmal antippen zum Bearbeiten.
            </p>
          ) : null}
        </>
      )}

      <div className={styles.toolbar} role="toolbar" aria-label="Gliederung bearbeiten">
        <button
          type="button"
          className={cx(styles.tool, tap.tap)}
          aria-label="Punkt hinzufügen"
          disabled={!canAddPoint(points)}
          onClick={add}
        >
          <PlusIcon size={22} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className={cx(styles.tool, tap.tap)}
          aria-label="Einrücken"
          disabled={selected === null || !canIndent(points, selected)}
          onClick={() => {
            if (selected !== null) change(indentPoint(points, selected));
          }}
        >
          <IndentIcon size={22} />
        </button>
        <button
          type="button"
          className={cx(styles.tool, tap.tap)}
          aria-label="Ausrücken"
          disabled={selected === null || !canOutdent(points, selected)}
          onClick={() => {
            if (selected !== null) change(outdentPoint(points, selected));
          }}
        >
          <OutdentIcon size={22} />
        </button>
        <button
          type="button"
          className={cx(styles.tool, styles.toolOn, tap.tap)}
          aria-label="Mit Karte verknüpfen"
          disabled={selected === null}
          onClick={() => {
            setSheet('link');
          }}
        >
          <LinkIcon size={22} strokeWidth={2.2} />
        </button>
      </div>

      {sheet === 'point' && sel && selected !== null ? (
        <PointSheet
          point={sel}
          label={paths[selected] ?? ''}
          error={pointErrors?.[sel.id]}
          services={services}
          canUp={canMove(points, selected, -1)}
          canDown={canMove(points, selected, 1)}
          onChange={(patch) => {
            change(updatePoint(points, selected, patch));
          }}
          onMove={(dir) => {
            const out = movePoint(points, selected, dir);
            change(out.points, out.index);
          }}
          onRemove={() => {
            change(removePoint(points, selected), null);
            setSheet(null);
          }}
          onLink={() => {
            setSheet('link');
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      {sheet === 'link' && sel && selected !== null ? (
        <LinkPicker
          point={sel}
          selfId={selfId}
          deckId={deckId}
          deckName={deckName}
          services={services}
          initialQuery={start?.query}
          initialCreating={start?.creating}
          onPick={(link) => {
            change(updatePoint(points, selected, { link }));
            setSheet(null);
          }}
          onClose={() => {
            setSheet(null);
          }}
        />
      ) : null}
      <Sheet
        open={sheet === 'discard'}
        onClose={() => {
          setSheet((s) => (s === 'discard' ? null : s));
        }}
        eyebrow="Schema"
        title="Änderungen verwerfen?"
      >
        <p className={styles.note}>
          Die Änderungen an der Gliederung sind noch nicht gesichert und gehen verloren.
        </p>
        <Button variant="danger" block onClick={onBack}>
          Verwerfen
        </Button>
        <Button
          variant="ghost"
          size="md"
          block
          onClick={() => {
            setSheet(null);
          }}
        >
          Weiter bearbeiten
        </Button>
      </Sheet>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows,
  autoFocus,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  error?: string | undefined;
}) {
  return (
    <label className={cx(styles.field, error && styles.fieldInvalid)}>
      <span className={styles.fieldLabel}>{label}</span>
      {rows ? (
        <textarea
          className={cx(styles.fieldInput, styles.fieldArea)}
          value={value}
          rows={rows}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
      ) : (
        <input
          className={styles.fieldInput}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
      )}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

/** Punkt bearbeiten (SchemaPunkt.dc.html): Text, Norm, Inhalt, Verknüpfung, Verschieben, Löschen. */
function PointSheet({
  point,
  label,
  error,
  services,
  canUp,
  canDown,
  onChange,
  onMove,
  onRemove,
  onLink,
  onClose,
}: {
  point: DraftPoint;
  label: string;
  error: string | undefined;
  services: LinkServices;
  canUp: boolean;
  canDown: boolean;
  onChange: (patch: Partial<Omit<DraftPoint, 'id'>>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onLink: () => void;
  onClose: () => void;
}) {
  const linked = services.useLinked(point.link);
  return (
    <Sheet open onClose={onClose} eyebrow={`Punkt ${label}`} title="Punkt bearbeiten">
      <div className={styles.sheetFields}>
        <Field
          label="Text"
          value={point.text}
          onChange={(text) => {
            onChange({ text });
          }}
          autoFocus={point.text === ''}
          error={error}
        />
        <Field
          label="Norm"
          value={point.norm}
          placeholder="§ 839 BGB"
          onChange={(norm) => {
            onChange({ norm });
          }}
        />
        <Field
          label="Inhalt"
          value={point.content}
          rows={3}
          placeholder="Definition oder Prüfungsinhalt. Erscheint beim Lernen unter dem Punkt."
          onChange={(content) => {
            onChange({ content });
          }}
        />
        {point.link === null ? (
          <button type="button" className={cx(styles.linkRow, tap.tap)} onClick={onLink}>
            <LinkIcon size={18} />
            Mit Karte verknüpfen
          </button>
        ) : (
          <div className={styles.linked}>
            <span className={styles.linkedIcon}>
              <LinkIcon size={16} />
            </span>
            <div className={styles.linkedText}>
              <span className={styles.linkedTitle}>
                {linked === 'missing' ? 'Karte nicht gefunden' : (linked?.title ?? '')}
              </span>
              {linked !== null && linked !== 'missing' ? (
                <span className={styles.linkedMeta}>{linked.meta}</span>
              ) : null}
            </div>
            <button type="button" className={styles.linkedButton} onClick={onLink}>
              Ändern
            </button>
          </div>
        )}
      </div>
      <div className={styles.moves}>
        <button
          type="button"
          className={cx(styles.move, tap.tap)}
          aria-label="Nach oben"
          disabled={!canUp}
          onClick={() => {
            onMove(-1);
          }}
        >
          <ArrowUpIcon size={20} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className={cx(styles.move, tap.tap)}
          aria-label="Nach unten"
          disabled={!canDown}
          onClick={() => {
            onMove(1);
          }}
        >
          <ArrowDownIcon size={20} strokeWidth={2.2} />
        </button>
      </div>
      <div className={styles.actions}>
        <button type="button" className={cx(styles.remove, tap.tap)} onClick={onRemove}>
          Löschen
        </button>
        <button type="button" className={cx(styles.done, tap.tap)} onClick={onClose}>
          Fertig
        </button>
      </div>
    </Sheet>
  );
}

/** Verknüpfen (SchemaEditor.dc.html, SchemaVerknuepfen.dc.html): Suche, Treffer, neue Karte. */
function LinkPicker({
  point,
  selfId,
  deckId,
  deckName,
  services,
  initialQuery,
  initialCreating,
  onPick,
  onClose,
}: {
  point: DraftPoint;
  selfId: string | undefined;
  deckId: string | null;
  deckName: string | null;
  services: LinkServices;
  initialQuery?: string | undefined;
  initialCreating?: boolean | undefined;
  onPick: (link: string | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery ?? (point.link === null ? point.text : ''));
  const rows = services.useCandidates(query, selfId);
  // Markierte Zeile für die Tastatur (Pfeile, Eingabetaste); die Suche setzt sie zurück.
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(initialCreating ?? false);
  const keyboard = useKeyboardOpen();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !creating) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, creating]);

  const trimmed = query.trim();

  return (
    <>
      <button type="button" className={styles.scrim} aria-label="Schließen" onClick={onClose} />
      <div
        className={cx(styles.popover, keyboard && styles.popoverTop)}
        role="dialog"
        aria-label="Mit Karte verknüpfen"
      >
        <label className={styles.search}>
          <SearchIcon size={16} />
          <span className="visually-hidden">Karte suchen</span>
          <input
            ref={input}
            className={styles.searchInput}
            value={query}
            placeholder="Karte suchen"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              const count = rows?.length ?? 0;
              if (e.key === 'ArrowDown' && count > 0) {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, count - 1));
              } else if (e.key === 'ArrowUp' && count > 0) {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                const row = rows?.[active];
                if (row) onPick(row.id);
              }
            }}
          />
        </label>
        <div className={styles.hits}>
          {(rows ?? []).map((row, i) => {
            const linked = row.id === point.link;
            const on = i === active;
            return (
              <button
                key={row.id}
                type="button"
                className={cx(styles.hit, on && styles.hitOn, tap.tap)}
                aria-pressed={linked}
                onClick={() => {
                  onPick(row.id);
                }}
              >
                <span className={styles.hitText}>
                  <span className={styles.hitTitle}>{row.title}</span>
                  <span className={styles.hitMeta}>{row.meta}</span>
                </span>
                {linked ? (
                  <CheckIcon size={18} strokeWidth={2.6} className={styles.hitCheck} />
                ) : null}
              </button>
            );
          })}
          {rows !== null && rows.length === 0 ? (
            <div className={styles.none}>
              {trimmed === '' ? 'Noch keine Karten vorhanden.' : 'Keine Karte gefunden.'}
            </div>
          ) : null}
        </div>
        {trimmed !== '' && deckId !== null ? (
          <button
            type="button"
            className={cx(styles.action, tap.tap)}
            onClick={() => {
              setCreating(true);
            }}
          >
            {`+ Neue Karte „${trimmed}“ anlegen`}
          </button>
        ) : null}
        {point.link !== null ? (
          <button
            type="button"
            className={cx(styles.action, styles.actionDanger, tap.tap)}
            onClick={() => {
              onPick(null);
            }}
          >
            Verknüpfung lösen
          </button>
        ) : null}
      </div>
      {creating && deckId !== null ? (
        <NewCardSheet
          front={trimmed}
          deckName={deckName}
          services={services}
          onCreated={(id) => {
            onPick(id);
          }}
          onClose={() => {
            setCreating(false);
          }}
          deckId={deckId}
        />
      ) : null}
    </>
  );
}

/** Neue Frage aus dem Schema heraus (SchemaNeueKarte.dc.html): wird sofort gespeichert und verknüpft. */
function NewCardSheet({
  front: initialFront,
  deckId,
  deckName,
  services,
  onCreated,
  onClose,
}: {
  front: string;
  deckId: string;
  deckName: string | null;
  services: LinkServices;
  onCreated: (cardId: string) => void;
  onClose: () => void;
}) {
  const [front, setFront] = useState(initialFront);
  const [back, setBack] = useState('');
  const [errors, setErrors] = useState<{ front?: string; back?: string }>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit() {
    if (busy) return;
    const checked = checkCard({ type: 'qa', front, back, text: '', norm: '', tags: '', note: '' });
    if (!checked.ok) {
      setErrors({
        ...(checked.errors.front ? { front: checked.errors.front } : {}),
        ...(checked.errors.back ? { back: checked.errors.back } : {}),
      });
      return;
    }
    setErrors({});
    setFailed(false);
    setBusy(true);
    try {
      onCreated(await services.createCard(deckId, checked.fields));
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow={
        <>
          <LinkIcon size={14} strokeWidth={2.4} />
          Neue Karte
        </>
      }
      title="Karte anlegen und verknüpfen"
    >
      <div className={styles.sheetFields}>
        <Field
          label="Vorderseite"
          value={front}
          rows={2}
          onChange={setFront}
          error={errors.front}
        />
        <Field
          label="Rückseite"
          value={back}
          rows={3}
          placeholder="Antwort"
          autoFocus
          onChange={setBack}
          error={errors.back}
        />
      </div>
      <p className={styles.note}>
        Die Frage liegt im Stapel {deckName ?? 'des Schemas'} und wird sofort gespeichert.
      </p>
      {failed ? (
        <p className={styles.error} role="alert">
          Das hat nicht geklappt. Bitte versuche es noch einmal.
        </p>
      ) : null}
      <Button block disabled={busy} onClick={() => void submit()}>
        Anlegen und verknüpfen
      </Button>
      <Button variant="ghost" size="md" block onClick={onClose}>
        Abbrechen
      </Button>
    </Sheet>
  );
}
