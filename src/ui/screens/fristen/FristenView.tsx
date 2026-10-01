import { Fragment } from 'react';
import type { DeadlineCard, DeadlinesModel } from '@/domain/deadlines/list';
import { CalendarIcon } from '../../components/icons';
import { Kbd } from '../../components/Kbd';
import { BackLink, Screen } from '../../components/Screen';
import { cx } from '../../cx';
import tap from '../../motion/tap.module.css';
import styles from './Fristen.module.css';

export interface FristenViewProps {
  model: DeadlinesModel;
  onAdd: () => void;
  onOpen: (id: string) => void;
  /** Kalenderdatei aller kommenden Fristen; ohne Angabe fehlt der Knopf. */
  onExport?: (() => void) | undefined;
  /** Rückmeldung zum Export, z. B. „Gespeichert.“ */
  exportNote?: string | null | undefined;
}

function Count({ card }: { card: DeadlineCard }) {
  if (card.count) {
    return (
      <span className={styles.count}>
        <span className={styles.big}>{card.count.big}</span>
        {card.count.unit ? <span className={styles.unit}>{card.count.unit}</span> : null}
      </span>
    );
  }
  if (card.tone === 'undated') return <span className={styles.pill}>Datum setzen</span>;
  return <span className={styles.past}>Vorbei</span>;
}

function Card({ card, onOpen }: { card: DeadlineCard; onOpen: (id: string) => void }) {
  const open = () => {
    onOpen(card.id);
  };
  const label = (
    <span className={styles.text}>
      <span className={styles.eyebrow}>{card.eyebrow}</span>
      <span className={styles.name}>{card.name}</span>
      <span className={styles.detail}>{card.detail}</span>
    </span>
  );
  if (card.tone === 'hero') {
    return (
      <button type="button" className={cx(styles.card, styles.hero, tap.tap)} onClick={open}>
        <span className={styles.top}>
          {label}
          <Count card={card} />
        </span>
        {card.progress ? (
          <span className={styles.progress}>
            <span className={styles.track} aria-hidden="true">
              <span
                className={styles.fill}
                style={{ display: 'block', width: `${card.progress.percent}%` }}
              />
            </span>
            <span className={styles.progressText}>
              <span>{card.progress.label}</span>
              {card.sprint ? <span>{card.sprint}</span> : null}
            </span>
          </span>
        ) : null}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={cx(
        styles.card,
        card.tone === 'undated' && styles.undated,
        card.tone === 'expired' && styles.expired,
        tap.tap,
      )}
      onClick={open}
    >
      {label}
      <Count card={card} />
    </button>
  );
}

/**
 * Fristen (Fristen.dc.html): Karten für Examen, Klausuren und Module. Die nächste Frist mit Datum
 * ist groß mit Fortschritt, weitere mit Datum haben einen Umriss, Fristen ohne Datum sind
 * gestrichelt, abgelaufene stehen gedämpft unter „Abgelaufen“. Rein; Daten und Sheets liefert Fristen.tsx.
 */
export function FristenView({ model, onAdd, onOpen, onExport, exportNote }: FristenViewProps) {
  const firstExpired = model.cards.findIndex((c) => c.tone === 'expired');
  const exportable = model.cards.some(
    (c) => c.status.phase === 'upcoming' || c.status.phase === 'sprint',
  );
  return (
    <Screen className={styles.screen}>
      <BackLink to="/einstellungen/lernrhythmus" label="Lernrhythmus" className={styles.back} />
      <header className={styles.head}>
        <h1 className={styles.title}>Fristen</h1>
        <p className={styles.lead}>
          Bis zum Termin kommt alles im Umfang rechtzeitig dran. Danach läuft der normale Rhythmus
          weiter.
        </p>
      </header>

      {model.empty ? (
        <div className={styles.empty}>
          <span className={styles.emptyTile}>
            <CalendarIcon size={32} strokeWidth={1.9} />
          </span>
          <h2 className={styles.emptyTitle}>Noch keine Fristen</h2>
          <p className={styles.emptyText}>
            Lege eine Klausur, das Examen oder ein Modul an. Bis zum Termin holt Juri die Karten
            rechtzeitig vor.
          </p>
        </div>
      ) : (
        model.cards.map((card, i) => (
          <Fragment key={card.id}>
            {i === firstExpired ? <h2 className={styles.section}>Abgelaufen</h2> : null}
            <Card card={card} onOpen={onOpen} />
          </Fragment>
        ))
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={cx(styles.add, tap.tap)}
          onClick={onAdd}
          aria-keyshortcuts="F"
        >
          + Frist hinzufügen
          <Kbd tone="dark">F</Kbd>
        </button>
        {onExport && exportable ? (
          <button type="button" className={styles.export} onClick={onExport} data-addition>
            Fristen als Kalenderdatei sichern
          </button>
        ) : null}
      </div>
      {exportNote ? (
        <p className={styles.note} role="status" data-addition>
          {exportNote}
        </p>
      ) : null}
    </Screen>
  );
}
