import { formatBytes } from '@/domain/format/bytes';
import { problemText, type MediaKind, type UploadProblem } from '@/domain/media/media';
import { Button } from '../../components/Button';
import { FileIcon, ImageIcon } from '../../components/icons';
import { Sheet } from '../../components/Sheet';
import tap from '../../motion/tap.module.css';
import { cx } from '../../cx';
import styles from './MediaSheets.module.css';

function Option({
  icon,
  title,
  text,
  onClick,
}: {
  icon: 'image' | 'pdf';
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={cx(styles.option, tap.tap)} onClick={onClick}>
      <span className={styles.optionIcon}>
        {icon === 'image' ? <ImageIcon size={22} /> : <FileIcon size={22} />}
      </span>
      <span className={styles.optionText}>
        <span className={styles.optionTitle}>{title}</span>
        <span className={styles.optionSub}>{text}</span>
      </span>
    </button>
  );
}

/** „Bild oder PDF-Seite wählen“ (AbdeckungQuelle.dc.html). */
export function SourceSheet({
  open,
  onClose,
  onImage,
  onPdf,
}: {
  open: boolean;
  onClose: () => void;
  onImage: () => void;
  onPdf: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} eyebrow="Abdeckung" title="Bild oder PDF-Seite wählen">
      <Option
        icon="image"
        title="Foto / Bild"
        text="Foto aufnehmen oder ein Bild aus Fotos und Dateien wählen"
        onClick={onImage}
      />
      <Option
        icon="pdf"
        title="PDF-Seite"
        text="Eine Seite aus einem PDF, bis 50 MB"
        onClick={onPdf}
      />
      <Button variant="ghost" size="md" block onClick={onClose}>
        Abbrechen
      </Button>
    </Sheet>
  );
}

/** Datei zu groß, nicht lesbar oder Speicher voll (MedienFehler.dc.html). */
export function ProblemSheet({
  problem,
  kind,
  onRetry,
  onClose,
}: {
  problem: UploadProblem | null;
  kind: MediaKind;
  onRetry: () => void;
  onClose: () => void;
}) {
  const text = problem ? problemText(problem, kind, formatBytes) : null;
  return (
    <Sheet
      open={problem !== null}
      onClose={onClose}
      eyebrow={kind === 'pdf' ? 'PDF' : 'Bild'}
      title={text?.title ?? ''}
    >
      <p className={styles.text}>{text?.text}</p>
      <Button block onClick={onRetry}>
        Andere Datei wählen
      </Button>
      <Button variant="ghost" size="md" block onClick={onClose}>
        Abbrechen
      </Button>
    </Sheet>
  );
}
