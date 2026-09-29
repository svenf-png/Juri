import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  AREA_SUGGESTIONS,
  areaDeletion,
  checkArea,
  missingSuggestions,
  sortAreas,
} from '@/domain/library/areas';
import { checkDeck } from '@/domain/library/deckRules';
import { areaDeckCounts, libraryModel } from '@/domain/library/library';
import type { Area, Deck } from '@/domain/model/records';
import { newId } from '@/platform/id';
import { addArea, addDeck, changeArea, changeDeck, removeArea } from '@/features/library/actions';
import { Button } from '../../components/Button';
import { CheckIcon, ChevronRightIcon, LinkIcon, PlusIcon, TrashIcon } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import { TextField } from '../../components/TextField';
import { cx } from '../../cx';
import stapel from './Stapel.module.css';
import styles from './Sheets.module.css';

/** Meldung, wenn Speichern oder Löschen scheitert; Eingaben bleiben stehen. */
const SAVE_FAILED = 'Das hat nicht geklappt. Bitte versuche es noch einmal.';

function useBusy() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await task();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  return { busy, failed, run };
}

function AreaChip({ name, on, onClick }: { name: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cx(stapel.areaChip, on && stapel.areaChipOn)}
      aria-pressed={on}
      onClick={onClick}
    >
      {on ? <CheckIcon size={16} /> : <PlusIcon size={16} strokeWidth={2.6} />}
      {name}
    </button>
  );
}

/** Bestätigung für endgültige Aktionen (Stapel, Karte, Rechtsgebiet löschen). */
export function ConfirmSheet({
  eyebrow,
  title,
  preview,
  info,
  usage,
  text,
  backup = false,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  eyebrow: string;
  title: string;
  preview?: { type: string; text: string };
  info?: readonly [string, string][];
  /** Verknüpfungen aus Schemas, die mit der Löschung entfallen (ADR-009). */
  usage?: { heading: string; rows: readonly (readonly [string, string])[] } | undefined;
  text: string;
  backup?: boolean;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const { busy, failed, run } = useBusy();
  return (
    <Sheet open onClose={onClose} eyebrow={eyebrow} title={title}>
      {preview ? (
        <div className={styles.preview}>
          <span className={styles.previewType}>{preview.type}</span>
          <span className={styles.previewText}>{preview.text}</span>
        </div>
      ) : null}
      {info ? (
        <dl className={styles.info}>
          {info.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {usage ? (
        <div className={styles.usage}>
          <span className={styles.usageHeading}>
            <LinkIcon size={14} strokeWidth={2.4} />
            {usage.heading}
          </span>
          {usage.rows.map(([title, count], i) => (
            <div key={i} className={styles.usageRow}>
              <span>{title}</span>
              <span className={styles.usageCount}>{count}</span>
            </div>
          ))}
        </div>
      ) : null}
      <p className={styles.para}>{text}</p>
      {backup ? (
        <Link to="/einstellungen" className={styles.linkButton}>
          Erst ein Backup sichern
        </Link>
      ) : null}
      {failed ? (
        <p className={styles.error} role="alert">
          {SAVE_FAILED}
        </p>
      ) : null}
      <Button variant="danger" block disabled={busy} onClick={() => void run(onConfirm)}>
        {confirmLabel}
      </Button>
      <Button variant="ghost" size="md" block onClick={onClose}>
        Abbrechen
      </Button>
    </Sheet>
  );
}

/**
 * Stapel anlegen (StapelAnlegen, StapelAnlegenErstes) und bearbeiten (StapelBearbeiten).
 * Gibt es noch kein Rechtsgebiet, stehen die üblichen als Vorschläge da; sie entstehen erst
 * beim Speichern, „Eigenes“ fragt Kürzel und Namen ab.
 */
export function StapelSheet({
  deck,
  areas,
  decks,
  defaultAreaId,
  onClose,
  onSaved,
}: {
  /** Vorhandener Stapel zum Bearbeiten; ohne wird ein neuer angelegt. */
  deck?: Deck;
  areas: readonly Area[];
  decks: readonly Deck[];
  /** Vorgewähltes Rechtsgebiet beim Anlegen (z. B. der aktive Filter). */
  defaultAreaId?: string | undefined;
  onClose: () => void;
  onSaved: (deckId: string) => void;
}) {
  const editing = deck !== undefined;
  const suggestionMode = !editing && areas.length === 0;
  const [name, setName] = useState(deck?.name ?? '');
  const [norm, setNorm] = useState(deck?.norm ?? '');
  const [areaIds, setAreaIds] = useState<string[]>(
    defaultAreaId && areas.some((a) => a.id === defaultAreaId) ? [defaultAreaId] : [],
  );
  const [picked, setPicked] = useState<string[]>([]);
  const [custom, setCustom] = useState<{ code: string; name: string } | null>(null);
  const [errors, setErrors] = useState<{
    name?: string | undefined;
    norm?: string | undefined;
    areas?: string | undefined;
    code?: string | undefined;
    area?: string | undefined;
  }>({});
  const { busy, failed, run } = useBusy();

  function toggle<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

  async function save() {
    const others = decks.filter((d) => d.id !== deck?.id);
    const newAreas: { id: string; code: string; name: string }[] = [];
    if (suggestionMode) {
      for (const code of picked) {
        const s = AREA_SUGGESTIONS.find((x) => x.code === code);
        if (s) newAreas.push({ id: newId(), ...s });
      }
      if (custom) {
        const checked = checkArea(custom, newAreas);
        if (!checked.ok) {
          setErrors({ code: checked.errors.code, area: checked.errors.name });
          return;
        }
        newAreas.push({ id: newId(), code: checked.code, name: checked.name });
      }
    }
    const ids = editing ? deck.areaIds : [...areaIds, ...newAreas.map((a) => a.id)];
    const checked = checkDeck({ name, norm, areaIds: ids }, others);
    if (!checked.ok) {
      setErrors({
        name: checked.errors.name,
        norm: checked.errors.norm,
        areas: checked.errors.areas,
      });
      return;
    }
    setErrors({});
    await run(async () => {
      if (editing) {
        await changeDeck(deck.id, { name: checked.name, norm: checked.norm });
        onSaved(deck.id);
      } else {
        const created = await addDeck({
          name: checked.name,
          norm: checked.norm,
          areaIds: checked.areaIds,
          newAreas,
        });
        onSaved(created.id);
      }
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow={editing ? 'Stapel bearbeiten' : 'Neuer Stapel'}
      title={editing ? 'Name und Normen' : 'Wie heißt der Stapel?'}
    >
      <TextField
        label="Name"
        value={name}
        onChange={setName}
        error={errors.name}
        autoFocus
        enterKeyHint="next"
      />
      <TextField
        label="Normen (optional)"
        value={norm}
        onChange={setNorm}
        placeholder="§§ 929 ff. BGB"
        error={errors.norm}
        enterKeyHint="done"
      />
      {editing ? (
        <p className={styles.hint}>Rechtsgebiete änderst du direkt im Stapel.</p>
      ) : (
        <div className={styles.group}>
          <h3 className={styles.label}>Rechtsgebiete</h3>
          <div className={styles.chips}>
            {suggestionMode ? (
              <>
                {AREA_SUGGESTIONS.map((s) => (
                  <AreaChip
                    key={s.code}
                    name={s.name}
                    on={picked.includes(s.code)}
                    onClick={() => {
                      setPicked(toggle(picked, s.code));
                    }}
                  />
                ))}
                <AreaChip
                  name="Eigenes"
                  on={custom !== null}
                  onClick={() => {
                    setCustom(custom ? null : { code: '', name: '' });
                  }}
                />
              </>
            ) : (
              sortAreas(areas).map((a) => (
                <AreaChip
                  key={a.id}
                  name={a.name}
                  on={areaIds.includes(a.id)}
                  onClick={() => {
                    setAreaIds(toggle(areaIds, a.id));
                  }}
                />
              ))
            )}
          </div>
          {custom ? (
            <div className={styles.fieldRow}>
              <TextField
                label="Kürzel"
                value={custom.code}
                onChange={(code) => {
                  setCustom({ ...custom, code });
                }}
                placeholder="AR"
                autoCapitalize="characters"
                error={errors.code}
              />
              <TextField
                label="Name"
                value={custom.name}
                onChange={(n) => {
                  setCustom({ ...custom, name: n });
                }}
                placeholder="Arbeitsrecht"
                error={errors.area}
              />
            </div>
          ) : null}
          {errors.areas ? (
            <p className={styles.error} role="alert">
              {errors.areas}
            </p>
          ) : (
            <p className={styles.hint}>
              {suggestionMode
                ? 'Tippe eins an, Juri legt es beim Speichern an. Später änderst du es über den Stift in der Stapel-Übersicht.'
                : 'Mindestens eins. Ein Stapel kann in mehreren liegen.'}
            </p>
          )}
        </div>
      )}
      {failed ? (
        <p className={styles.error} role="alert">
          {SAVE_FAILED}
        </p>
      ) : null}
      <Button block disabled={busy} className={styles.spaceTop} onClick={() => void save()}>
        {editing ? 'Speichern' : 'Stapel anlegen'}
      </Button>
      <Button variant="ghost" size="md" block onClick={onClose}>
        Abbrechen
      </Button>
    </Sheet>
  );
}

type AreaView =
  { t: 'list' } | { t: 'new' } | { t: 'edit'; id: string } | { t: 'delete'; id: string };

/** Rechtsgebiete verwalten: Liste, anlegen, bearbeiten, löschen (GebieteVerwalten bis GebietLoeschen). */
export function GebieteSheet({
  areas,
  decks,
  onClose,
}: {
  areas: readonly Area[];
  decks: readonly Deck[];
  onClose: () => void;
}) {
  const [view, setView] = useState<AreaView>({ t: 'list' });
  const rows = areaDeckCounts(areas, decks);
  const current = 'id' in view ? areas.find((a) => a.id === view.id) : undefined;
  const back = () => {
    setView({ t: 'list' });
  };

  if (view.t === 'list' || (view.t !== 'new' && !current)) {
    return (
      <Sheet open onClose={onClose} eyebrow="Rechtsgebiete" title="Rechtsgebiete verwalten">
        <div className={styles.rows}>
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              className={styles.row}
              onClick={() => {
                setView({ t: 'edit', id: r.id });
              }}
              aria-label={`${r.name} bearbeiten, ${r.meta}`}
            >
              <span className={styles.badge}>{r.code}</span>
              <span className={styles.rowText}>
                <span className={styles.rowName}>{r.name}</span>
                <span className={styles.rowMeta}>{r.meta}</span>
              </span>
              <span className={styles.rowIcon}>
                <ChevronRightIcon size={18} />
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.dashedRow}
          onClick={() => {
            setView({ t: 'new' });
          }}
        >
          <PlusIcon size={18} />
          Rechtsgebiet anlegen
        </button>
        <Button variant="ink" block onClick={onClose}>
          Fertig
        </Button>
      </Sheet>
    );
  }
  if (view.t === 'new' || view.t === 'edit') {
    return (
      <AreaForm
        key={view.t}
        area={current}
        areas={areas}
        onDelete={
          current
            ? () => {
                setView({ t: 'delete', id: current.id });
              }
            : undefined
        }
        onDone={back}
        onClose={onClose}
      />
    );
  }
  return current ? (
    <AreaDelete area={current} decks={decks} onBack={back} onClose={onClose} />
  ) : null;
}

function AreaForm({
  area,
  areas,
  onDelete,
  onDone,
  onClose,
}: {
  area?: Area | undefined;
  areas: readonly Area[];
  onDelete?: (() => void) | undefined;
  onDone: () => void;
  onClose: () => void;
}) {
  const [code, setCode] = useState(area?.code ?? '');
  const [name, setName] = useState(area?.name ?? '');
  const [errors, setErrors] = useState<{ code?: string | undefined; name?: string | undefined }>(
    {},
  );
  const { busy, failed, run } = useBusy();
  const others = areas.filter((a) => a.id !== area?.id);
  const suggestions = area ? [] : missingSuggestions(areas);

  async function save() {
    const checked = checkArea({ code, name }, others);
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    await run(async () => {
      if (area) await changeArea(area.id, { code: checked.code, name: checked.name });
      else await addArea({ code: checked.code, name: checked.name });
      onDone();
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow={area ? 'Rechtsgebiet bearbeiten' : 'Neues Rechtsgebiet'}
      title={area ? area.name : 'Wie heißt das Rechtsgebiet?'}
    >
      {suggestions.length > 0 ? (
        <div className={styles.group}>
          <h3 className={styles.label}>Vorschläge</h3>
          <div className={styles.chips}>
            {suggestions.map((s) => (
              <AreaChip
                key={s.code}
                name={`${s.code} ${s.name}`}
                on={code === s.code && name === s.name}
                onClick={() => {
                  setCode(s.code);
                  setName(s.name);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className={styles.fieldRow}>
        <TextField
          label="Kürzel"
          value={code}
          onChange={setCode}
          placeholder="AR"
          autoCapitalize="characters"
          error={errors.code}
        />
        <TextField
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Arbeitsrecht"
          error={errors.name}
          autoFocus={area !== undefined}
        />
      </div>
      <p className={styles.hint}>Das Kürzel hat zwei bis vier Zeichen und steht auf dem Etikett.</p>
      {onDelete ? (
        <button
          type="button"
          className={cx(styles.linkButton, styles.dangerLink)}
          onClick={onDelete}
        >
          <TrashIcon size={18} />
          Rechtsgebiet löschen
        </button>
      ) : null}
      {failed ? (
        <p className={styles.error} role="alert">
          {SAVE_FAILED}
        </p>
      ) : null}
      <Button block disabled={busy} onClick={() => void save()}>
        {area ? 'Speichern' : 'Anlegen'}
      </Button>
      <Button variant="ghost" size="md" block onClick={onDone}>
        Abbrechen
      </Button>
    </Sheet>
  );
}

function AreaDelete({
  area,
  decks,
  onBack,
  onClose,
}: {
  area: Area;
  decks: readonly Deck[];
  onBack: () => void;
  onClose: () => void;
}) {
  const rule = areaDeletion(area.id, decks);
  if (!rule.ok) {
    return (
      <Sheet
        open
        onClose={onClose}
        eyebrow="Rechtsgebiet löschen"
        title={`${area.name} enthält Stapel, die sonst nirgends liegen`}
      >
        <p className={styles.para}>
          Ordne diese Stapel zuerst einem weiteren Rechtsgebiet zu oder lösche sie:
        </p>
        <div className={styles.rows}>
          {rule.blockedBy.map((d) => (
            <Link key={d.id} to={`/stapel/${d.id}`} className={styles.row} onClick={onClose}>
              <span className={styles.rowText}>
                <span className={styles.rowName}>{d.name}</span>
              </span>
              <span className={styles.rowIcon}>
                <ChevronRightIcon size={18} />
              </span>
            </Link>
          ))}
        </div>
        <Button variant="ink" block onClick={onBack}>
          Verstanden
        </Button>
      </Sheet>
    );
  }
  const stays = rule.alsoElsewhere.length;
  return (
    <ConfirmSheet
      eyebrow="Rechtsgebiet löschen"
      title={`${area.name} löschen?`}
      info={[
        ['Stapel im Rechtsgebiet', String(stays)],
        ['Bleiben erhalten', String(stays)],
        ['Karten gelöscht', '0'],
      ]}
      text="Nur das Rechtsgebiet verschwindet. Alle Stapel und Karten bleiben erhalten."
      confirmLabel="Rechtsgebiet löschen"
      onClose={onBack}
      onConfirm={async () => {
        const result = await removeArea(area.id);
        // Hat sich der Stand geändert (ein Stapel liegt jetzt nur noch hier), zeigt die Ansicht
        // gleich die Sperre; die Bestätigung gilt dann nicht als erledigt.
        if (!result.ok) throw new Error('Rechtsgebiet enthält Stapel');
        onBack();
      }}
    />
  );
}

/** Rechtsgebiete eines Stapels umschalten (iPad: „+ Rechtsgebiet“). Das letzte bleibt. */
export function AreaPickSheet({
  areas,
  deck,
  onToggle,
  onClose,
}: {
  areas: readonly Area[];
  deck: Deck;
  onToggle: (areaId: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow="Rechtsgebiete"
      title="In welchen Rechtsgebieten liegt der Stapel?"
    >
      <div className={styles.rows}>
        {sortAreas(areas).map((a) => {
          const on = deck.areaIds.includes(a.id);
          return (
            <button
              key={a.id}
              type="button"
              className={styles.row}
              aria-pressed={on}
              onClick={() => {
                onToggle(a.id);
              }}
            >
              <span className={styles.badge}>{a.code}</span>
              <span className={styles.rowText}>
                <span className={styles.rowName}>{a.name}</span>
              </span>
              {on ? (
                <span className={styles.rowCheck}>
                  <CheckIcon size={22} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className={styles.hint}>Mindestens eins. Ein Stapel kann in mehreren liegen.</p>
      <Button variant="ink" block onClick={onClose}>
        Fertig
      </Button>
    </Sheet>
  );
}

/** Stapel wählen (StapelWaehlen): gruppiert nach Rechtsgebiet, Antippen wählt und schließt. */
export function StapelWaehlenSheet({
  areas,
  decks,
  cardCounts,
  selectedId,
  onPick,
  onNew,
  onClose,
}: {
  areas: readonly Area[];
  decks: readonly Deck[];
  cardCounts: Readonly<Record<string, number>>;
  selectedId: string | undefined;
  onPick: (deckId: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const model = libraryModel({ areas, decks, cardCounts, dueCounts: {} });
  let body: ReactNode;
  if (model.empty) {
    body = <p className={styles.para}>Noch kein Stapel. Lege den ersten an.</p>;
  } else {
    body = (
      <div className={styles.pickGroups}>
        {model.groups.map((g) => (
          <div key={g.id}>
            <div className={styles.pickGroupHead}>
              <span className={styles.badge}>{g.code}</span>
              <h3 className={styles.pickGroupName}>{g.name}</h3>
            </div>
            {g.stacks.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.pickRow}
                aria-pressed={s.id === selectedId}
                onClick={() => {
                  onPick(s.id);
                }}
              >
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{s.name}</span>
                  <span className={styles.rowMeta}>
                    {s.also ? `${s.meta} · ${s.also}` : s.meta}
                  </span>
                </span>
                {s.id === selectedId ? (
                  <span className={styles.rowCheck}>
                    <CheckIcon size={22} />
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <Sheet open onClose={onClose} eyebrow="Stapel" title="Wohin kommt die Karte?">
      {body}
      <button type="button" className={styles.dashedRow} onClick={onNew}>
        <PlusIcon size={18} />
        Neuer Stapel
      </button>
      <Button variant="ghost" size="md" block onClick={onClose}>
        Abbrechen
      </Button>
    </Sheet>
  );
}
