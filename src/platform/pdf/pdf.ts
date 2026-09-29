/**
 * PDF-Adapter (M6, ADR-010): pdf.js wird erst beim ersten Öffnen eines PDFs geladen und nur hier
 * benutzt (Schichten: `domain/media/pdfPlan.ts` rechnet, dieser Adapter zeichnet). Läuft ohne
 * WebAssembly, weil die CSP es nicht erlaubt; der Worker kommt vom eigenen Origin.
 */
import type * as PdfJs from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy, RenderTask, TextLayer } from 'pdfjs-dist';
import { IMAGE_MAX_EDGE, PDF_MAX_PAGES } from '@/domain/media/media';
import { fitWithin } from '@/domain/media/media';
import { renderPlan } from '@/domain/media/pdfPlan';
import { encodeJpeg, MediaProblem } from '../media/prepareImage';

let loaded: Promise<typeof PdfJs> | undefined;

async function pdfjs(): Promise<typeof PdfJs> {
  loaded ??= (async () => {
    const [lib, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    lib.GlobalWorkerOptions.workerSrc = worker.default;
    return lib;
  })();
  return loaded;
}

export interface PdfPage {
  readonly number: number;
  /** Größe der Seite in PDF-Punkten (1/72 Zoll), Drehung eingerechnet. */
  readonly width: number;
  readonly height: number;
  /**
   * Zeichnet die Seite auf `canvas`, `cssWidth` CSS-Pixel breit. Liefert den Plan (Größe der
   * Zeichenfläche, ob die Dichte begrenzt wurde). `cancel` bricht ein laufendes Zeichnen ab.
   */
  render: (
    canvas: HTMLCanvasElement,
    cssWidth: number,
    dpr: number,
  ) => { done: Promise<ReturnType<typeof renderPlan> | null>; cancel: () => void };
  /** Textebene zum Markieren in `container` (eine Zeile je Stück, unsichtbar über der Seite). */
  renderText: (
    container: HTMLElement,
    cssWidth: number,
  ) => { done: Promise<void>; cancel: () => void };
  /** Gibt Speicher der Seite frei (nach dem Wegblättern). */
  release: () => void;
}

export interface PdfDocument {
  readonly pages: number;
  page: (number: number) => Promise<PdfPage>;
  /** Seite als JPEG, längste Kante höchstens `maxEdge` (Abdeckung aus einer PDF-Seite). */
  pageImage: (
    number: number,
    maxEdge?: number,
  ) => Promise<{ data: ArrayBuffer; width: number; height: number }>;
  destroy: () => Promise<void>;
}

/** Fehler beim Öffnen: kein PDF, beschädigt, verschlüsselt oder zu viele Seiten. */
export type PdfProblem = 'unlesbar' | 'passwort' | 'zu-viele-seiten';

export class PdfError extends Error {
  readonly problem: PdfProblem;

  constructor(problem: PdfProblem) {
    super(problem);
    this.name = 'PdfError';
    this.problem = problem;
  }
}

function wrapPage(proxy: PDFPageProxy): PdfPage {
  const base = proxy.getViewport({ scale: 1 });
  return {
    number: proxy.pageNumber,
    width: base.width,
    height: base.height,
    render(canvas, cssWidth, dpr) {
      const plan = renderPlan(base.width, base.height, cssWidth, dpr);
      canvas.width = plan.canvasWidth;
      canvas.height = plan.canvasHeight;
      const ctx = canvas.getContext('2d');
      let task: RenderTask | undefined;
      const done = (async () => {
        if (!ctx) return null;
        task = proxy.render({
          canvas,
          canvasContext: ctx,
          viewport: proxy.getViewport({ scale: plan.scale }),
        });
        try {
          await task.promise;
          return plan;
        } catch (error) {
          // Ein abgebrochenes Zeichnen ist kein Fehler, das Ergebnis ist dann veraltet.
          if (error instanceof Error && error.name === 'RenderingCancelledException') return null;
          throw error;
        }
      })();
      return {
        done,
        cancel: () => {
          task?.cancel();
        },
      };
    },
    renderText(container, cssWidth) {
      let layer: TextLayer | undefined;
      const done = (async () => {
        const lib = await pdfjs();
        const scale = cssWidth / base.width;
        container.style.setProperty('--total-scale-factor', String(scale));
        container.replaceChildren();
        layer = new lib.TextLayer({
          textContentSource: proxy.streamTextContent(),
          container,
          viewport: proxy.getViewport({ scale }),
        });
        try {
          await layer.render();
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortException') return;
          throw error;
        }
      })();
      return {
        done,
        cancel: () => {
          layer?.cancel();
        },
      };
    },
    release() {
      proxy.cleanup();
    },
  };
}

/** Öffnet ein PDF aus Bytes. Die Bytes bleiben unberührt (pdf.js bekommt eine Kopie). */
export async function openPdf(bytes: ArrayBuffer): Promise<PdfDocument> {
  const lib = await pdfjs();
  let doc: PDFDocumentProxy;
  try {
    doc = await lib.getDocument({
      data: new Uint8Array(bytes.slice(0)),
      useWasm: false,
      useSystemFonts: true,
      enableXfa: false,
    }).promise;
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException')
      throw new PdfError('passwort');
    throw new PdfError('unlesbar');
  }
  if (doc.numPages > PDF_MAX_PAGES) {
    await doc.destroy();
    throw new PdfError('zu-viele-seiten');
  }
  const cache = new Map<number, PDFPageProxy>();
  const proxyOf = async (n: number) => {
    const known = cache.get(n);
    if (known) return known;
    const proxy = await doc.getPage(n);
    cache.set(n, proxy);
    return proxy;
  };
  return {
    pages: doc.numPages,
    page: async (n) => wrapPage(await proxyOf(n)),
    async pageImage(n, maxEdge = IMAGE_MAX_EDGE) {
      const proxy = await proxyOf(n);
      const base = proxy.getViewport({ scale: 1 });
      const target = fitWithin(Math.round(base.width * 4), Math.round(base.height * 4), maxEdge);
      const scale = target.width / base.width;
      const canvas = document.createElement('canvas');
      canvas.width = target.width;
      canvas.height = target.height;
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new MediaProblem({ code: 'unbekannt' });
        await proxy.render({
          canvas,
          canvasContext: ctx,
          viewport: proxy.getViewport({ scale }),
          background: '#FFFFFF',
        }).promise;
        const bitmap = await createImageBitmap(canvas);
        try {
          return await encodeJpeg(bitmap, maxEdge);
        } finally {
          bitmap.close();
        }
      } finally {
        canvas.width = 0;
        canvas.height = 0;
        proxy.cleanup();
      }
    },
    async destroy() {
      cache.clear();
      await doc.destroy();
    },
  };
}
