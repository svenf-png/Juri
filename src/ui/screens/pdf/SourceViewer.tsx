import { useEffect, useState } from 'react';
import { openStoredPdf } from '@/features/media/media';
import type { PdfDocument } from '@/platform/pdf/pdf';
import { PdfPageView } from './PdfPageView';
import { PdfPane } from './PdfPane';
import styles from './SourceViewer.module.css';

/**
 * Das gespeicherte PDF einer Karte an ihrer Seite öffnen („Anhang … Öffnen“, Antwort.dc.html):
 * Vollbild zum Lesen und Blättern, ohne Übernehmen in eine Karte.
 */
export function SourceViewer({
  mediaId,
  page: start,
  onClose,
}: {
  mediaId: string;
  page: number | null;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState<{ doc: PdfDocument; name: string } | null | 'missing'>(null);
  const [page, setPage] = useState(start ?? 1);

  useEffect(() => {
    let cancelled = false;
    let opened: PdfDocument | undefined;
    void openStoredPdf(mediaId).then((result) => {
      if (cancelled) {
        void result?.document.destroy();
        return;
      }
      if (!result) {
        setLoaded('missing');
        return;
      }
      opened = result.document;
      setLoaded({ doc: result.document, name: result.name });
    });
    return () => {
      cancelled = true;
      void opened?.destroy();
    };
  }, [mediaId]);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="PDF">
      {loaded === 'missing' ? (
        <div className={styles.missing}>
          <p>Das PDF ist nicht mehr gespeichert.</p>
          <button type="button" className={styles.close} onClick={onClose}>
            Schließen
          </button>
        </div>
      ) : loaded ? (
        <PdfPane
          layout="phone"
          fileName={loaded.name}
          page={page}
          pages={loaded.doc.pages}
          onPage={(next) => {
            setPage(Math.min(Math.max(1, next), loaded.doc.pages));
          }}
          onClose={onClose}
          hint="Zwei Finger zum Zoomen"
        >
          <PdfPageView key={page} doc={loaded.doc} page={Math.min(page, loaded.doc.pages)} />
        </PdfPane>
      ) : null}
    </div>
  );
}
