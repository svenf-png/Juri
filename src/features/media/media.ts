/**
 * Bilder und PDFs für Karten (M6): Datei wählen, prüfen, vorbereiten und als Medium-Datensatz
 * bereithalten. Gespeichert wird erst mit der Karte (`addCard`), damit nichts Verwaistes bleibt.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  checkSize,
  checkUpload,
  hasRoom,
  PDF_MAX_PAGES,
  type UploadProblem,
} from '@/domain/media/media';
import type { MediaRecord } from '@/domain/model/records';
import { readMedia } from '@/data/repositories/media';
import { newId } from '@/platform/id';
import { displayName, MediaProblem, prepareImage } from '@/platform/media/prepareImage';
import { openPdf, PdfError, type PdfDocument } from '@/platform/pdf/pdf';
import { database } from '../app/database';

async function ensureRoom(bytes: number): Promise<void> {
  const estimate = await navigator.storage.estimate().catch(() => ({}));
  if (!hasRoom(bytes, estimate)) throw new ProblemError({ code: 'speicher-voll' });
}

export class ProblemError extends Error {
  readonly problem: UploadProblem;

  constructor(problem: UploadProblem) {
    super(problem.code);
    this.name = 'ProblemError';
    this.problem = problem;
  }
}

/** Ergebnis der Bildvorbereitung samt Zahlen für die Anzeige „Verkleinert“. */
export interface ImageDraft {
  readonly record: MediaRecord;
  readonly originalSize: number;
  readonly originalWidth: number;
  readonly originalHeight: number;
  readonly resized: boolean;
}

/** Bild prüfen, verkleinern und als Datensatz bereitstellen; wirft `ProblemError`. */
export async function draftImage(file: File): Promise<ImageDraft> {
  try {
    const prepared = await prepareImage(file);
    await ensureRoom(prepared.size);
    return {
      record: {
        id: newId(),
        kind: 'image',
        mime: prepared.mime,
        name: displayName(file, 'Bild'),
        size: prepared.size,
        width: prepared.width,
        height: prepared.height,
        createdAt: Date.now(),
        data: prepared.data,
      },
      originalSize: prepared.originalSize,
      originalWidth: prepared.originalWidth,
      originalHeight: prepared.originalHeight,
      resized: prepared.resized,
    };
  } catch (error) {
    if (error instanceof MediaProblem) throw new ProblemError(error.problem);
    throw error;
  }
}

/** Ein geöffnetes PDF mit seinen Bytes; gespeichert wird es mit der ersten Karte daraus. */
export interface PdfDraft {
  readonly document: PdfDocument;
  readonly bytes: ArrayBuffer;
  readonly name: string;
  readonly pages: number;
  /** Kennung, unter der es (nach der ersten Karte) gespeichert ist; vorher neu vergeben. */
  readonly id: string;
  readonly stored: boolean;
}

export async function draftPdf(file: File): Promise<PdfDraft> {
  const early = checkSize(file.size, 'pdf');
  if (early) throw new ProblemError(early);
  const bytes = await file.arrayBuffer();
  const checked = checkUpload(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 16)), 'pdf');
  if (!checked.ok) throw new ProblemError(checked.problem);
  await ensureRoom(bytes.byteLength);
  try {
    const document = await openPdf(bytes);
    return {
      document,
      bytes,
      name: file.name.slice(0, 200) || 'Dokument.pdf',
      pages: document.pages,
      id: newId(),
      stored: false,
    };
  } catch (error) {
    if (error instanceof PdfError) {
      throw new ProblemError(
        error.problem === 'passwort'
          ? { code: 'pdf-passwort' }
          : error.problem === 'zu-viele-seiten'
            ? { code: 'pdf-zu-viele-seiten', limit: PDF_MAX_PAGES }
            : { code: 'pdf-unlesbar' },
      );
    }
    throw error;
  }
}

/** Datensatz zum PDF-Entwurf, für die erste Karte daraus. */
export function pdfRecord(draft: PdfDraft): MediaRecord {
  return {
    id: draft.id,
    kind: 'pdf',
    mime: 'application/pdf',
    name: draft.name,
    size: draft.bytes.byteLength,
    pages: draft.pages,
    createdAt: Date.now(),
    data: draft.bytes,
  };
}

/** Meldung zu einem Problem (Artboard `MedienFehler`). */
export function isProblemError(error: unknown): error is ProblemError {
  return error instanceof ProblemError;
}

export type MediaUrl =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; url: string; record: MediaRecord };

/** Bild-URL zu einem gespeicherten Medium; gibt die URL beim Verlassen wieder frei. */
export function useMediaUrl(id: string | null): MediaUrl {
  const [state, setState] = useState<{ id: string; value: MediaUrl } | null>(null);
  useEffect(() => {
    if (id === null) return undefined;
    let cancelled = false;
    let url: string | undefined;
    void readMedia(database(), id)
      .then((record) => {
        if (cancelled) return;
        if (!record) {
          setState({ id, value: { status: 'missing' } });
          return;
        }
        url = URL.createObjectURL(new Blob([record.data], { type: record.mime }));
        setState({ id, value: { status: 'ready', url, record } });
      })
      .catch(() => {
        if (!cancelled) setState({ id, value: { status: 'missing' } });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  if (id === null) return { status: 'missing' };
  return state?.id === id ? state.value : { status: 'loading' };
}

/** Öffnet ein gespeichertes PDF (Herkunft einer Karte); `null`, wenn es fehlt oder nicht lesbar ist. */
export async function openStoredPdf(
  id: string,
): Promise<{ document: PdfDocument; name: string } | null> {
  const record = await readMedia(database(), id);
  if (!record || record.kind !== 'pdf') return null;
  try {
    return { document: await openPdf(record.data), name: record.name };
  } catch {
    return null;
  }
}

/** Bild-URL zu einem noch nicht gespeicherten Bild (Entwurf); gibt sie beim Verlassen frei. */
export function useBlobUrl(record: MediaRecord | null): string | null {
  const url = useMemo(
    () => (record ? URL.createObjectURL(new Blob([record.data], { type: record.mime })) : null),
    [record],
  );
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}
