import { useState, type ReactNode } from 'react';
import { pdfShortcut } from '@/domain/device/shortcuts';
import { pageLabel, parsePage } from '@/domain/media/pdfPlan';
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons';
import { cx } from '../../cx';
import { useKeys } from '../../useKeys';
import styles from './PdfPane.module.css';

export type PdfMode = 'text' | 'cover';

export interface PdfPaneProps {
  /** iPhone: Vollbild mit Blättern und „Zur Karte“; iPad: linke Hälfte neben dem Formular. */
  layout: 'phone' | 'pad';
  fileName: string;
  page: number;
  pages: number;
  onPage: (page: number) => void;
  /** Umschalter „Text“ / „Abdecken“; fehlt er, ist die Ansicht nur zum Lesen. */
  mode?: PdfMode | undefined;
  onMode?: ((mode: PdfMode) => void) | undefined;
  /** „Schließen“ (iPad) beziehungsweise Zurück zur Karte (iPhone). */
  onClose: () => void;
  closeLabel?: string;
  /** Text unter der Seite („Markieren mit dem Finger“). */
  hint: string;
  /** Beschriftung des großen Knopfes unten (iPhone), z. B. „Zur Karte“. */
  actionLabel?: string | undefined;
  /** Die Seite, Auswahlleiste und Ähnliches. */
  children: ReactNode;
}

/** Blättern: Seitenzahl antippen zum Eingeben, Pfeile für vor und zurück. */
function Pager({
  page,
  pages,
  onPage,
  compact = false,
}: {
  page: number;
  pages: number;
  onPage: (page: number) => void;
  /** Kleine Leiste über der Seite (iPad), sonst die große unter der Seite (iPhone). */
  compact?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className={cx(styles.pager, compact && styles.pagerCompact)}>
      <button
        type="button"
        className={styles.pagerButton}
        aria-label="Vorige Seite"
        disabled={page <= 1}
        onClick={() => {
          onPage(page - 1);
        }}
      >
        <ChevronLeftIcon size={22} strokeWidth={2.2} />
      </button>
      {editing ? (
        <input
          className={styles.pageInput}
          inputMode="numeric"
          aria-label={`Seite, 1 bis ${String(pages)}`}
          defaultValue={String(page)}
          autoFocus
          onFocus={(event) => {
            event.currentTarget.select();
          }}
          onBlur={(event) => {
            const next = parsePage(event.currentTarget.value, pages);
            if (next !== null) onPage(next);
            setEditing(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
            if (event.key === 'Escape') setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          className={styles.pagerLabel}
          aria-label={`${pageLabel(page, pages)}, Seite wählen`}
          onClick={() => {
            setEditing(true);
          }}
        >
          {pageLabel(page, pages)}
        </button>
      )}
      <button
        type="button"
        className={styles.pagerButton}
        aria-label="Nächste Seite"
        disabled={page >= pages}
        onClick={() => {
          onPage(page + 1);
        }}
      >
        <ChevronRightIcon size={22} strokeWidth={2.2} />
      </button>
    </div>
  );
}

/**
 * PDF-Ansicht: Kopfzeile, Seite (als Inhalt übergeben) und je nach Layout Hinweis, Blättern und
 * „Zur Karte“. Rein: Seite und Zustand kommen von außen, damit die Vorschau die Beispieldaten des
 * Designs einsetzen kann (PdfVorschau.tsx).
 */
export function PdfPane({
  layout,
  fileName,
  page,
  pages,
  onPage,
  mode,
  onMode,
  onClose,
  closeLabel = 'Schließen',
  hint,
  actionLabel,
  children,
}: PdfPaneProps) {
  const phone = layout === 'phone';
  // Bild auf/ab, Pfeile links/rechts, Pos1 und Ende blättern (Desktop).
  useKeys((input) => {
    const action = pdfShortcut(input);
    const target =
      action === 'previous'
        ? page - 1
        : action === 'next'
          ? page + 1
          : action === 'first'
            ? 1
            : action === 'last'
              ? pages
              : null;
    if (target === null) return false;
    if (target >= 1 && target <= pages && target !== page) onPage(target);
    return true;
  });
  return (
    <section className={cx(styles.pane, phone ? styles.phone : styles.pad)} aria-label="PDF">
      <div className={styles.head}>
        <button type="button" className={styles.close} onClick={onClose}>
          {closeLabel}
        </button>
        <span className={styles.title}>
          {fileName}
          {phone ? null : <span className={styles.titleMuted}> · {pageLabel(page, pages)}</span>}
        </span>
        {mode !== undefined && onMode ? (
          <div className={styles.modes} role="group" aria-label="Modus">
            {(
              [
                ['text', 'Text'],
                ['cover', 'Abdecken'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cx(styles.mode, mode === value && styles.modeOn)}
                aria-pressed={mode === value}
                onClick={() => {
                  onMode(value);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className={styles.page}>
        {children}
        {phone ? null : (
          <>
            <span className={styles.padHint}>{hint}</span>
            <div className={styles.padPager} data-addition="">
              <Pager page={page} pages={pages} onPage={onPage} compact />
            </div>
          </>
        )}
      </div>
      {phone ? (
        <>
          <div className={styles.hint}>{hint}</div>
          <Pager page={page} pages={pages} onPage={onPage} />
          {actionLabel !== undefined ? (
            <button type="button" className={styles.cta} onClick={onClose}>
              {actionLabel}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
