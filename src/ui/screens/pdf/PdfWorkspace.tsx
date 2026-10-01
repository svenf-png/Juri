import { gestureHints } from '@/domain/device/environment';
import { currentEnvironment } from '@/features/app/install';
import { useState } from 'react';
import { ordinals, removeMask, type Mask } from '@/domain/cards/occlusion';
import type { CardMedia } from '../erstellen/useCardMedia';
import type { CoverState } from '../erstellen/form';
import { useBlobUrl } from '@/features/media/media';
import { SurfaceImage } from '../../components/CoverSurface';
import { TrashIcon } from '../../components/icons';
import { useMediaQuery } from '../../useMediaQuery';
import { MaskCanvas } from '../erstellen/MaskCanvas';
import { PdfPageView } from './PdfPageView';
import { PdfPane } from './PdfPane';
import styles from './PdfWorkspace.module.css';

/**
 * Die PDF-Ansicht beim Erstellen einer Karte: im Modus „Text“ die Seite mit der Leiste zum
 * Übernehmen einer Markierung, im Modus „Abdecken“ die Seite als Bild mit Feldern. Die Zustände
 * liegen in `useCardMedia`, die Felder im Formular (`cover`).
 */
export function PdfWorkspace({
  layout,
  media,
  cover,
  onCover,
  onClose,
}: {
  layout: 'phone' | 'pad';
  media: CardMedia;
  cover: CoverState;
  onCover: (patch: Partial<CoverState>) => void;
  onClose: () => void;
}) {
  const { pdf } = media;
  const [selected, setSelected] = useState<number | null>(media.seed?.selected ?? null);
  const desktop = useMediaQuery('(min-width: 1280px)');
  const url = useBlobUrl(media.mode === 'cover' ? (cover.draft?.record ?? null) : null);
  if (!pdf) return null;
  const cover_ = media.mode === 'cover';
  // Vorschauen (mit `seed`) zeigen die Texte des Designs, unabhängig vom Browser der Tests.
  const hints = gestureHints(media.seed ? (desktop ? 'desktop' : 'ios') : currentEnvironment());
  const phone = layout === 'phone';
  const hint = cover_
    ? phone
      ? 'Felder mit dem Finger aufziehen'
      : hints.pdfCover
    : phone
      ? 'Markieren mit dem Finger'
      : hints.pdfText;
  const labels = ordinals(cover.masks);
  const current = cover.masks.find((m) => m.n === selected);

  return (
    <PdfPane
      layout={layout}
      fileName={pdf.name}
      page={media.page}
      pages={pdf.pages}
      onPage={media.setPage}
      mode={media.mode}
      onMode={media.setMode}
      onClose={onClose}
      closeLabel={phone ? 'Karte' : 'Schließen'}
      hint={hint}
      actionLabel={phone ? 'Zur Karte' : undefined}
    >
      {media.seed?.pageContent !== undefined && !cover_ ? (
        media.seed.pageContent
      ) : cover_ ? (
        (url || media.seed?.coverImage) && cover.ratio > 0 ? (
          <div className={styles.cover}>
            <MaskCanvas
              ratio={cover.ratio}
              image={media.seed?.coverImage ?? <SurfaceImage src={url ?? ''} />}
              masks={cover.masks}
              selected={selected}
              everUsed={cover.everUsed}
              onChange={(masks: Mask[], everUsed) => {
                onCover({ masks, everUsed: Math.max(cover.everUsed, everUsed) });
              }}
              onSelect={setSelected}
              label="PDF-Seite, Felder aufziehen"
            />
            {current ? (
              <button
                type="button"
                className={styles.remove}
                data-addition=""
                onClick={() => {
                  onCover({ masks: removeMask(cover.masks, current.n) });
                  setSelected(null);
                }}
              >
                <TrashIcon size={18} />
                Feld {labels.get(current.n)} löschen
              </button>
            ) : null}
          </div>
        ) : (
          <div className={styles.wait}>Seite wird vorbereitet</div>
        )
      ) : (
        <PdfPageView
          key={media.page}
          doc={pdf.document}
          page={media.page}
          onSelection={media.takeSelection}
        />
      )}
    </PdfPane>
  );
}
