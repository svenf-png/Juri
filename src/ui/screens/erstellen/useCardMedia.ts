import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { draftToMarkup, draftFromMarkup } from '@/domain/cards/clozeDraft';
import type { MediaKind, UploadProblem } from '@/domain/media/media';
import { applySelection, type SelectionRole } from '@/domain/media/pdfPlan';
import type { MediaRecord, Source } from '@/domain/model/records';
import {
  draftImage,
  draftPdf,
  isProblemError,
  pdfRecord,
  type ImageDraft,
  type PdfDraft,
} from '@/features/media/media';
import { newId } from '@/platform/id';
import { displayName } from '@/platform/media/prepareImage';
import { pickFile } from '@/platform/pickFile';
import type { PdfMode } from '../pdf/PdfPane';
import { EMPTY_COVER, type FormState } from './form';

export interface CardMedia {
  pdf: PdfDraft | null;
  /** Die PDF-Ansicht ist geöffnet (iPhone: Vollbild, iPad: neben dem Formular). */
  pdfOpen: boolean;
  page: number;
  mode: PdfMode;
  /** Bild wird gerade geprüft und verkleinert. */
  busy: { name: string; size: number } | null;
  problem: { kind: MediaKind; problem: UploadProblem } | null;
  sourceSheet: boolean;
  editor: boolean;
  /** Felder, die aus einer Markierung im PDF stammen („aus PDF übernommen“). */
  applied: { front: boolean; back: boolean };
  chooseImage: () => void;
  choosePdf: (mode: PdfMode) => void;
  openSourceSheet: () => void;
  closeSourceSheet: () => void;
  dismissProblem: () => void;
  retry: () => void;
  openEditor: () => void;
  closeEditor: () => void;
  showPdf: () => void;
  hidePdf: () => void;
  removePdf: () => void;
  setPage: (page: number) => void;
  setMode: (mode: PdfMode) => void;
  takeSelection: (role: SelectionRole, text: string) => void;
  /** Bilder und PDF, die mit der nächsten Karte gespeichert werden, und ihre Herkunft. */
  forSave: () => { media: MediaRecord[]; source: Source | undefined };
  afterSave: () => void;
}

/**
 * Bilder und PDFs im Erstellen: Foto wählen und verkleinern, PDF öffnen und blättern, Markierung
 * in die Karte übernehmen, eine PDF-Seite als Bild für die Abdeckung festhalten. Das Formular
 * gehört dem Aufrufer; gespeichert wird erst mit der Karte (`forSave`, `afterSave`).
 */
export function useCardMedia(
  form: FormState,
  setForm: Dispatch<SetStateAction<FormState>>,
  editing: boolean,
): CardMedia {
  const [pdf, setPdf] = useState<PdfDraft | null>(null);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<PdfMode>('text');
  const [busy, setBusy] = useState<CardMedia['busy']>(null);
  const [problem, setProblem] = useState<CardMedia['problem']>(null);
  const [sourceSheet, setSourceSheet] = useState(false);
  const [editor, setEditor] = useState(false);
  const [applied, setApplied] = useState({ front: false, back: false });
  // Das geöffnete PDF für Aufräumarbeiten außerhalb des Renderns (Zustandsänderungen bleiben rein).
  const latest = useRef<PdfDraft | null>(null);
  useEffect(() => {
    latest.current = pdf;
  }, [pdf]);

  const fail = (kind: MediaKind, error: unknown) => {
    setProblem({
      kind,
      problem: isProblemError(error) ? error.problem : { code: 'unbekannt' },
    });
  };

  const chooseImage = () => {
    setSourceSheet(false);
    // Der Datei-Dialog muss synchron aus dem Tippen heraus starten (iOS).
    void pickFile('image/*').then(async (file) => {
      if (!file) return;
      setBusy({ name: displayName(file, 'Bild'), size: file.size });
      try {
        const draft = await draftImage(file);
        setForm((f) => ({
          ...f,
          tab: 'cover',
          cover: {
            ...EMPTY_COVER,
            draft,
            ratio: (draft.record.width ?? 1) / (draft.record.height ?? 1),
          },
        }));
        setEditor(true);
      } catch (error) {
        fail('image', error);
      } finally {
        setBusy(null);
      }
    });
  };

  const choosePdf = (startMode: PdfMode) => {
    setSourceSheet(false);
    void pickFile('application/pdf').then(async (file) => {
      if (!file) return;
      try {
        const draft = await draftPdf(file);
        void latest.current?.document.destroy();
        latest.current = draft;
        setPdf(draft);
        setPage(1);
        setMode(startMode);
        setPdfOpen(true);
        setApplied({ front: false, back: false });
        setForm((f) => ({
          ...f,
          tab: startMode === 'cover' ? 'cover' : f.tab === 'cover' ? 'qa' : f.tab,
          cover: EMPTY_COVER,
        }));
      } catch (error) {
        fail('pdf', error);
      }
    });
  };

  // Abdecken im PDF: Die angezeigte Seite wird als Bild festgehalten, die Felder liegen darauf.
  const coverPage = form.cover.page;
  const coverDraft = form.cover.draft;
  useEffect(() => {
    if (!pdf || !pdfOpen || mode !== 'cover' || (coverPage === page && coverDraft))
      return undefined;
    let cancelled = false;
    void pdf.document
      .pageImage(page)
      .then((img) => {
        if (cancelled) return;
        const draft: ImageDraft = {
          record: {
            id: newId(),
            kind: 'image',
            mime: 'image/jpeg',
            name: `${pdf.name.replace(/\.pdf$/iu, '')} S. ${String(page)}`,
            size: img.data.byteLength,
            width: img.width,
            height: img.height,
            createdAt: Date.now(),
            data: img.data,
          },
          originalSize: img.data.byteLength,
          originalWidth: img.width,
          originalHeight: img.height,
          resized: false,
        };
        setForm((f) => ({
          ...f,
          cover: { ...EMPTY_COVER, draft, ratio: img.width / img.height, page },
        }));
      })
      .catch((error: unknown) => {
        if (!cancelled) fail('pdf', error);
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, pdfOpen, mode, page, coverPage, coverDraft, setForm]);

  const removePdf = useCallback(() => {
    void latest.current?.document.destroy();
    latest.current = null;
    setPdf(null);
    setPdfOpen(false);
    setMode('text');
    setForm((f) => (f.cover.page === null ? f : { ...f, cover: EMPTY_COVER }));
  }, [setForm]);

  // Beim Verlassen des Bildschirms gibt das PDF seinen Speicher frei.
  useEffect(
    () => () => {
      void latest.current?.document.destroy();
    },
    [],
  );

  const retryKind = problem?.kind;
  return {
    pdf,
    pdfOpen,
    page,
    mode,
    busy,
    problem,
    sourceSheet,
    editor,
    applied,
    chooseImage,
    choosePdf,
    openSourceSheet: () => {
      setSourceSheet(true);
    },
    closeSourceSheet: () => {
      setSourceSheet(false);
    },
    dismissProblem: () => {
      setProblem(null);
    },
    retry: () => {
      setProblem(null);
      if (retryKind === 'pdf') choosePdf(mode);
      else chooseImage();
    },
    openEditor: () => {
      setEditor(true);
    },
    closeEditor: () => {
      setEditor(false);
    },
    showPdf: () => {
      setPdfOpen(true);
    },
    hidePdf: () => {
      setPdfOpen(false);
    },
    removePdf,
    setPage: (next) => {
      if (pdf) setPage(Math.min(Math.max(1, next), pdf.pages));
    },
    setMode: (next) => {
      setMode(next);
      setForm((f) => ({
        ...f,
        tab: next === 'cover' ? 'cover' : f.tab === 'cover' ? 'qa' : f.tab,
      }));
    },
    takeSelection: (role, text) => {
      setForm((f) => {
        const patch = applySelection(role, text, { text: draftToMarkup(f.draft) });
        return {
          ...f,
          ...(patch.front === undefined ? {} : { front: patch.front }),
          ...(patch.back === undefined ? {} : { back: patch.back }),
          ...(patch.text === undefined ? {} : { draft: draftFromMarkup(patch.text) }),
          ...(patch.tab === undefined ? {} : { tab: patch.tab }),
        };
      });
      if (role !== 'cloze') setApplied((a) => ({ ...a, [role]: true }));
    },
    forSave: () => {
      const media: MediaRecord[] = [];
      if (form.tab === 'cover' && form.cover.draft) media.push(form.cover.draft.record);
      if (pdf && !pdf.stored) media.push(pdfRecord(pdf));
      const source: Source | undefined = pdf
        ? {
            name: pdf.name,
            page: form.tab === 'cover' && form.cover.page !== null ? form.cover.page : page,
            mediaId: pdf.id,
          }
        : editing
          ? (form.source ?? undefined)
          : undefined;
      return { media, source };
    },
    afterSave: () => {
      setPdf((before) => (before ? { ...before, stored: true } : before));
      setApplied({ front: false, back: false });
    },
  };
}
