import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SelectionRole } from '@/domain/media/pdfPlan';
import { tidySelection } from '@/domain/media/pdfPlan';
import type { PdfDocument, PdfPage } from '@/platform/pdf/pdf';
import { cx } from '../../cx';
import { useZoomPan } from '../../useZoomPan';
import styles from './PdfPageView.module.css';

/** Abstand der Seite zum Rand der Karte. */
const MARGIN = 12;
/** Stufen, in denen die Zeichenfläche bei Vergrößerung neu gerendert wird (schärfer, nicht größer). */
const RENDER_STEPS = [1, 2, 3, 4, 6] as const;

const ROLES: readonly { role: SelectionRole; label: string }[] = [
  { role: 'back', label: 'Als Antwort' },
  { role: 'front', label: 'Als Frage' },
  { role: 'cloze', label: 'Als Lücke' },
];

function stepFor(zoom: number): number {
  return RENDER_STEPS.find((s) => s >= zoom) ?? 6;
}

export interface PdfPageViewProps {
  doc: PdfDocument;
  page: number;
  /** Mit dieser Funktion erscheint die Leiste „Als Antwort / Als Frage / Als Lücke“ bei Markierungen. */
  onSelection?: ((role: SelectionRole, text: string) => void) | undefined;
  /** Zeichenfläche und Größe der Seite nach dem Rendern, z. B. für Tests. */
  onRendered?: (() => void) | undefined;
}

/**
 * Eine Seite eines PDFs: nur diese Seite ist im Speicher gezeichnet (Zeichenfläche wird beim
 * Wegblättern freigegeben), Zwei-Finger-Zoom rendert nach kurzer Ruhe schärfer nach, Markieren
 * öffnet die Leiste zum Übernehmen in die Karte. Pro Seite eine eigene Instanz (`key={page}`), damit
 * Zoom und Markierung beim Blättern von selbst zurückgesetzt werden.
 */
export function PdfPageView({ doc, page, onSelection, onRendered }: PdfPageViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [proxy, setProxy] = useState<{ page: number; value: PdfPage } | null>(null);
  const [failed, setFailed] = useState(false);
  const [renderZoom, setRenderZoom] = useState(1);
  const [selection, setSelection] = useState<{ x: number; y: number; text: string } | null>(null);
  const zoom = useZoomPan(frame, { pan1: true, keys: true });

  // Größe des Platzes.
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return undefined;
    const measure = () => {
      setBox({ width: element.clientWidth, height: element.clientHeight });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Seite laden; die vorige gibt ihren Speicher frei.
  useEffect(() => {
    let cancelled = false;
    let loaded: PdfPage | undefined;
    doc.page(page).then(
      (value) => {
        if (cancelled) {
          value.release();
          return;
        }
        loaded = value;
        setProxy({ page, value });
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      loaded?.release();
    };
  }, [doc, page]);

  const current = proxy?.page === page ? proxy.value : null;
  const fit = (() => {
    if (!current || box.width === 0) return { width: 0, height: 0 };
    const availW = box.width - 2 * MARGIN;
    const availH = box.height - 2 * MARGIN;
    const width = Math.max(1, Math.min(availW, availH * (current.width / current.height)));
    return { width, height: width * (current.height / current.width) };
  })();

  // Nach dem Zoomen kurz warten, dann schärfer rendern.
  useEffect(() => {
    const target = stepFor(zoom.viewport.zoom);
    const timer = window.setTimeout(() => {
      setRenderZoom(target);
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [zoom.viewport.zoom]);
  // Zeichenfläche.
  useEffect(() => {
    const target = canvas.current;
    if (!current || !target || fit.width === 0) return undefined;
    const job = current.render(target, fit.width * renderZoom, window.devicePixelRatio);
    let cancelled = false;
    void job.done.then((plan) => {
      if (!cancelled && plan) onRendered?.();
    });
    return () => {
      cancelled = true;
      job.cancel();
    };
  }, [current, fit.width, renderZoom, onRendered]);

  // Freigeben beim Verlassen: iOS zählt Zeichenflächen gegen den Speicher der Seite.
  useEffect(() => {
    const target = canvas.current;
    return () => {
      if (target) {
        target.width = 0;
        target.height = 0;
      }
    };
  }, []);

  // Textebene.
  useEffect(() => {
    const container = text.current;
    if (!current || !container || fit.width === 0) return undefined;
    const job = current.renderText(container, fit.width);
    job.done.catch(() => undefined);
    return () => {
      job.cancel();
    };
  }, [current, fit.width]);

  // Markierung verfolgen.
  useEffect(() => {
    if (!onSelection) return undefined;
    const onChange = () => {
      const sel = document.getSelection();
      const layer = text.current;
      const rootEl = root.current;
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !layer || !rootEl) {
        setSelection(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!layer.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }
      const raw = tidySelection(sel.toString());
      if (raw === '') {
        setSelection(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      const base = rootEl.getBoundingClientRect();
      setSelection({
        x: rect.left + rect.width / 2 - base.left,
        y: rect.bottom - base.top + 10,
        text: raw,
      });
    };
    document.addEventListener('selectionchange', onChange);
    return () => {
      document.removeEventListener('selectionchange', onChange);
    };
  }, [onSelection]);

  // Die Leiste bleibt im Bild.
  useLayoutEffect(() => {
    const bar = popup.current;
    const rootEl = root.current;
    if (!bar || !rootEl || !selection) return;
    const half = bar.offsetWidth / 2;
    bar.style.left = `${String(Math.min(Math.max(selection.x, half + 8), rootEl.clientWidth - half - 8))}px`;
    const below = selection.y + bar.offsetHeight + 8 <= rootEl.clientHeight;
    bar.style.top = `${String(below ? selection.y : Math.max(8, selection.y - bar.offsetHeight - 44))}px`;
  }, [selection]);

  return (
    <div ref={root} className={styles.root}>
      {failed ? <div className={styles.wait}>Seite nicht lesbar</div> : null}
      <div
        ref={frame}
        className={styles.frame}
        style={{ width: fit.width, height: fit.height, display: current ? undefined : 'none' }}
        data-page={page}
        {...zoom.bind}
      >
        <div className={styles.inner} style={{ transform: zoom.transform }}>
          <canvas ref={canvas} className={styles.canvas} />
          <div ref={text} className={cx(styles.text)} />
        </div>
      </div>
      {selection && onSelection ? (
        <div ref={popup} className={styles.popup} role="toolbar" aria-label="Markierung übernehmen">
          {ROLES.map(({ role, label }, i) => (
            <button
              key={role}
              type="button"
              className={cx(styles.popupButton, i === 0 && styles.popupPrimary)}
              // Ein Tippen darf die Markierung nicht auflösen, bevor der Text übernommen ist.
              onPointerDown={(event) => {
                event.preventDefault();
              }}
              onClick={() => {
                onSelection(role, selection.text);
                document.getSelection()?.removeAllRanges();
                setSelection(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
