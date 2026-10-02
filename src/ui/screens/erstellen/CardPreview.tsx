import { useState, type ReactNode } from 'react';
import type { CardPreview as Preview } from '@/domain/cards/preview';
import { FlipIcon } from '../../components/icons';
import { cx } from '../../cx';
import styles from './CardPreview.module.css';

export interface CardPreviewProps {
  preview: Preview;
  /** Rechtsgebiete des Stapels („ZR, ÖR“); leer, solange kein Stapel gewählt ist. */
  area: string;
  norm: string;
  /** Platzhalter, solange die jeweilige Seite leer ist (die Schrift der Karte bleibt sichtbar). */
  empty: { front: string; back: string };
  /** Abdeckung: Bild mit den Feldern, verdeckt vorn und aufgedeckt hinten. */
  cover?: { front: ReactNode; back: ReactNode } | undefined;
}

/**
 * Vorschau der Karte neben dem Formular (nur ab 1280 px, ADR-017): so erscheint sie beim Lernen,
 * die Rückseite zeigt der Umschalter. Ändert nichts an den Eingaben.
 */
export function CardPreview({ preview, area, norm, empty, cover }: CardPreviewProps) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const text = side === 'front' ? preview.front : preview.back;
  const placeholder = side === 'front' ? empty.front : empty.back;
  return (
    <aside className={styles.preview} aria-label="Vorschau der Karte">
      <div className={styles.bar}>
        <span className={styles.label}>Vorschau</span>
        <div className={styles.switch} role="group" aria-label="Seite der Vorschau">
          {(['front', 'back'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={cx(styles.option, side === value && styles.selected)}
              aria-pressed={side === value}
              onClick={() => {
                setSide(value);
              }}
            >
              {value === 'front' ? 'Vorderseite' : 'Rückseite'}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.head}>
          {area ? <span className={styles.area}>{area}</span> : null}
          <span className={styles.type}>{preview.typeLabel}</span>
          <span className={styles.norm}>{norm}</span>
        </div>
        <div className={styles.middle}>
          {cover ? (
            <div className={styles.cover}>{side === 'front' ? cover.front : cover.back}</div>
          ) : (
            <div className={cx(styles.text, text === '' && styles.placeholder)}>
              {text === '' ? placeholder : text}
            </div>
          )}
        </div>
        <div className={styles.hint}>
          <FlipIcon size={16} />
          {side === 'front' ? 'Klicken zum Umdrehen' : 'Antwort'}
        </div>
      </div>
      <p className={styles.help}>
        So erscheint die Karte beim Lernen. Die Rückseite zeigst du mit dem Umschalter.
      </p>
    </aside>
  );
}
