import { libraryModel } from '@/domain/library/library';
import {
  CONFLICT_CHOICES,
  conflictText,
  conflictsLead,
  outcomeRows,
  type ShareCopy,
} from '@/domain/juri/text';
import type { Conflict, MergeSummary, Resolution } from '@/domain/juri/merge';
import type { Area, Deck } from '@/domain/model/records';
import { Button } from '../../components/Button';
import { CheckIcon } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import sheets from '../stapel/Sheets.module.css';
import styles from './Teilen.module.css';

/** Stapel wählen (mehrere): gruppiert nach Rechtsgebiet wie „Wohin kommt die Karte?“. */
export function DeckShareSheet({
  areas,
  decks,
  cardCounts,
  selected,
  onToggle,
  onClose,
}: {
  areas: readonly Area[];
  decks: readonly Deck[];
  cardCounts: Readonly<Record<string, number>>;
  selected: readonly string[];
  onToggle: (deckId: string) => void;
  onClose: () => void;
}) {
  const model = libraryModel({ areas, decks, cardCounts, dueCounts: {} });
  return (
    <Sheet open onClose={onClose} eyebrow="Teilen" title="Was möchtest du teilen?">
      <div className={sheets.pickGroups}>
        {model.groups.map((g) => (
          <div key={g.id}>
            <div className={sheets.pickGroupHead}>
              <span className={sheets.badge}>{g.code}</span>
              <h3 className={sheets.pickGroupName}>{g.name}</h3>
            </div>
            {g.stacks.map((s) => {
              const on = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={sheets.pickRow}
                  aria-pressed={on}
                  onClick={() => {
                    onToggle(s.id);
                  }}
                >
                  <span className={sheets.rowText}>
                    <span className={sheets.rowName}>{s.name}</span>
                    <span className={sheets.rowMeta}>
                      {s.also ? `${s.meta} · ${s.also}` : s.meta}
                    </span>
                  </span>
                  {on ? (
                    <span className={sheets.rowCheck}>
                      <CheckIcon size={22} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <Button block disabled={selected.length === 0} onClick={onClose}>
        Fertig
      </Button>
    </Sheet>
  );
}

/** Konflikte: pro Karte „Meine behalten“ oder „Import nehmen“; ohne Wahl bleibt deine Karte. */
export function ConflictSheet({
  conflicts,
  busy,
  failed,
  onDecide,
  onConfirm,
  onClose,
}: {
  conflicts: readonly Conflict[];
  busy: boolean;
  failed: boolean;
  onDecide: (cardId: string, resolution: Resolution) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open onClose={onClose} eyebrow="Konflikte" title="Was soll gelten?">
      <p className={styles.lead}>{conflictsLead(conflicts.length)}</p>
      <div className={styles.list}>
        {conflicts.map((c) => {
          const text = conflictText(c);
          const choices = CONFLICT_CHOICES[c.kind];
          return (
            <div key={c.cardId} className={styles.conflict}>
              <span className={styles.conflictTitle}>{text.title}</span>
              <span className={styles.conflictDetail}>{text.detail}</span>
              <div className={styles.choice} role="group" aria-label={text.title}>
                <button
                  type="button"
                  aria-pressed={c.resolution === 'mine'}
                  onClick={() => {
                    onDecide(c.cardId, 'mine');
                  }}
                >
                  {choices.mine}
                </button>
                <button
                  type="button"
                  aria-pressed={c.resolution === 'theirs'}
                  onClick={() => {
                    onDecide(c.cardId, 'theirs');
                  }}
                >
                  {choices.theirs}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {failed ? (
        <p className={sheets.error} role="alert">
          Das hat nicht geklappt. Deine Daten sind unverändert.
        </p>
      ) : null}
      <Button block disabled={busy} onClick={onConfirm}>
        Importieren
      </Button>
      <Button variant="ghost" size="md" block onClick={onClose}>
        Abbrechen
      </Button>
    </Sheet>
  );
}

/** Meldung nach dem Import mit den Zahlen. */
export function ImportedSheet({
  summary,
  onOpenDeck,
  onClose,
}: {
  summary: MergeSummary;
  onOpenDeck: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open onClose={onClose} eyebrow="Import" title="Stapel importiert">
      <dl className={sheets.info}>
        {outcomeRows(summary).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className={sheets.paraMuted}>Dein Lernfortschritt ist unverändert.</p>
      <Button block onClick={onOpenDeck}>
        Zum Stapel
      </Button>
      <Button variant="ghost" size="md" block onClick={onClose}>
        Schließen
      </Button>
    </Sheet>
  );
}

/** Import-Anleitung: erst in „Dateien“ sichern, dann hier öffnen (Entscheidung 2, ADR-003). */
export function GuideSheet({
  copy,
  onOpenFile,
  onClose,
}: {
  copy: ShareCopy;
  onOpenFile: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open onClose={onClose} eyebrow="Import" title="So kommt die Datei in Juri">
      <ol className={styles.steps}>
        {copy.steps.map((step, i) => (
          <li key={step.title} className={styles.step}>
            <span className={styles.stepNumber} aria-hidden="true">
              {i + 1}
            </span>
            <span className={styles.stepText}>
              <span className={styles.stepTitle}>{step.title}</span>
              <span className={styles.stepBody}>{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
      <Button block onClick={onOpenFile}>
        Datei öffnen
      </Button>
      <Button variant="ghost" size="md" block onClick={onClose}>
        Schließen
      </Button>
    </Sheet>
  );
}
