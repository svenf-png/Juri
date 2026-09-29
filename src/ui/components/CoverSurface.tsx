import type { CSSProperties, PointerEventHandler, ReactNode, RefObject } from 'react';
import type { Handle } from '@/domain/cards/occlusion';
import { cx } from '../cx';
import styles from './CoverSurface.module.css';

export type SurfaceLook = 'covered' | 'asked' | 'revealed' | 'selected';

export interface SurfaceMask {
  readonly n: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Anzeigenummer 1, 2, 3. */
  readonly label: number;
  readonly look: SurfaceLook;
}

const pct = (v: number) => `${String(Math.round(v * 10_000) / 100)}%`;

/** Lage eines Feldes in Prozent der Fläche. */
function maskStyle(m: Pick<SurfaceMask, 'x' | 'y' | 'w' | 'h'>): CSSProperties {
  return { left: pct(m.x), top: pct(m.y), width: pct(m.w), height: pct(m.h) };
}

const HANDLES: readonly Handle[] = ['nw', 'ne', 'sw', 'se'];

/** Lage der Ecke eines Feldes für den Anfasser. */
function handleStyle(m: SurfaceMask, handle: Handle): CSSProperties {
  return {
    left: pct(handle === 'nw' || handle === 'sw' ? m.x : m.x + m.w),
    top: pct(handle === 'nw' || handle === 'ne' ? m.y : m.y + m.h),
  };
}

export interface CoverSurfaceProps {
  /** Seitenverhältnis Breite durch Höhe. */
  ratio: number;
  /** Bild, oder bei Vorschauen beliebiger Inhalt in der Größe der Fläche. */
  children: ReactNode;
  masks: readonly SurfaceMask[];
  /** Transformation des Zooms (useZoomPan). */
  transform?: string | undefined;
  frameRef?: RefObject<HTMLDivElement | null> | undefined;
  innerRef?: RefObject<HTMLDivElement | null> | undefined;
  /** Zeiger-Ereignisse des Rahmens (Zoom, Zeichnen). */
  frameProps?:
    | {
        onPointerDown?: PointerEventHandler<HTMLDivElement>;
        onPointerMove?: PointerEventHandler<HTMLDivElement>;
        onPointerUp?: PointerEventHandler<HTMLDivElement>;
        onPointerCancel?: PointerEventHandler<HTMLDivElement>;
        onDoubleClick?: React.MouseEventHandler<HTMLDivElement>;
      }
    | undefined;
  /** Felder sind bedienbar (Editor): Tastatur, Antippen, Anfasser. */
  editable?: boolean;
  onMaskKeyDown?: ((n: number, event: React.KeyboardEvent<HTMLDivElement>) => void) | undefined;
  onHandlePointerDown?:
    ((n: number, handle: Handle, event: React.PointerEvent<HTMLSpanElement>) => void) | undefined;
  /** Lernen: Tippen auf das gefragte Feld deckt es auf. */
  onAskedPress?: (() => void) | undefined;
  /** Feld, das gerade aufgezogen wird. */
  draft?: Pick<SurfaceMask, 'x' | 'y' | 'w' | 'h'> | null | undefined;
  /** Zusätzlicher Inhalt über den Feldern (Hinweis im leeren Editor). */
  overlay?: ReactNode;
  className?: string | undefined;
  label?: string;
}

/**
 * Bild mit Feldern: Rahmen im Seitenverhältnis des Bildes (passt in den Platz des Elternelements),
 * darin die Fläche mit Bild und Feldern, die der Zoom verschiebt. Alle Positionen in Prozent.
 */
export function CoverSurface({
  ratio,
  children,
  masks,
  transform,
  frameRef,
  innerRef,
  frameProps,
  editable = false,
  onMaskKeyDown,
  onAskedPress,
  draft,
  overlay,
  className,
  label,
}: CoverSurfaceProps) {
  const selected = masks.find((m) => m.look === 'selected');
  return (
    <div className={cx(styles.stage, className)}>
      <div
        ref={frameRef}
        className={styles.frame}
        style={{ '--ratio': ratio } as CSSProperties}
        role="group"
        aria-label={label}
        {...frameProps}
      >
        <div
          ref={innerRef}
          className={styles.inner}
          style={transform === undefined ? undefined : { transform }}
        >
          {children}
          {masks.map((m) => {
            const editing = editable;
            return (
              <div
                key={m.n}
                className={cx(
                  styles.mask,
                  styles[m.look],
                  m.look === 'asked' && styles.pulse,
                  editing && styles.editable,
                )}
                style={maskStyle(m)}
                data-mask={m.n}
                {...(editing
                  ? {
                      role: 'button',
                      tabIndex: 0,
                      'aria-label': `Feld ${String(m.label)}${m.look === 'selected' ? ', gewählt' : ''}`,
                      'aria-pressed': m.look === 'selected',
                      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                        onMaskKeyDown?.(m.n, event);
                      },
                    }
                  : m.look === 'asked' && onAskedPress
                    ? {
                        role: 'button',
                        tabIndex: 0,
                        'aria-label': `Feld ${String(m.label)} aufdecken`,
                        onClick: onAskedPress,
                        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onAskedPress();
                          }
                        },
                      }
                    : {})}
              >
                {m.look === 'asked' ? `${String(m.label)} ?` : m.look === 'revealed' ? '' : m.label}
              </div>
            );
          })}
          {selected && editable
            ? HANDLES.map((handle) => (
                <span
                  key={handle}
                  className={styles.handle}
                  style={handleStyle(selected, handle)}
                  data-handle={handle}
                />
              ))
            : null}
          {draft ? (
            <div className={cx(styles.mask, styles.draft)} style={maskStyle(draft)} />
          ) : null}
        </div>
        {overlay}
      </div>
    </div>
  );
}

/** Bild einer Abdeckung, füllt die Fläche. */
export function SurfaceImage({ src, alt = '' }: { src: string; alt?: string }) {
  return <img className={styles.image} src={src} alt={alt} draggable={false} />;
}

/** Ersatz, wenn das Bild fehlt (aus einem unvollständigen Backup oder gelöscht). */
export function SurfaceMissing() {
  return (
    <div className={styles.missing} role="img" aria-label="Bild fehlt">
      Bild nicht gefunden
    </div>
  );
}
