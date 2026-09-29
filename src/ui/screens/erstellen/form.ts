import { formatTags } from '@/domain/cards/card';
import { draftFromMarkup, EMPTY_DRAFT, type ClozeDraft } from '@/domain/cards/clozeDraft';
import { pointsToDraft, type DraftPoint } from '@/domain/cards/schema';
import type { Mask } from '@/domain/cards/occlusion';
import type { Card, Source } from '@/domain/model/records';
import type { ImageDraft } from '@/features/media/media';

/** Reiter des Erstellen-Bildschirms. */
export type Tab = 'qa' | 'cloze' | 'schema' | 'cover';

/** Abdeckung im Formular: Bild (neu oder gespeichert), Felder und Herkunft des Bildes. */
export interface CoverState {
  /** Neu gewähltes Bild; wird mit der Karte gespeichert. */
  readonly draft: ImageDraft | null;
  /** Gespeichertes Bild beim Bearbeiten. */
  readonly mediaId: string | null;
  /** Seitenverhältnis Breite durch Höhe; 0, solange unbekannt. */
  readonly ratio: number;
  readonly masks: readonly Mask[];
  /** Höchste je vergebene Feldnummer (eine gelöschte kehrt nicht wieder). */
  readonly everUsed: number;
  /** Das Bild ist Seite `page` des geöffneten PDFs. */
  readonly page: number | null;
}

export const EMPTY_COVER: CoverState = {
  draft: null,
  mediaId: null,
  ratio: 0,
  masks: [],
  everUsed: 0,
  page: null,
};

export interface FormState {
  tab: Tab;
  front: string;
  back: string;
  draft: ClozeDraft;
  /** Schema: Titel und Gliederung. */
  title: string;
  points: DraftPoint[];
  cover: CoverState;
  /** Herkunft der Karte beim Bearbeiten; neue Karten bekommen sie vom geöffneten PDF. */
  source: Source | null;
  norm: string;
  tags: string;
  note: string;
}

export const EMPTY_FORM: FormState = {
  tab: 'qa',
  front: '',
  back: '',
  draft: EMPTY_DRAFT,
  title: '',
  points: [],
  cover: EMPTY_COVER,
  source: null,
  norm: '',
  tags: '',
  note: '',
};

export function formFromCard(card: Card): FormState {
  return {
    tab: card.type,
    front: card.type === 'qa' ? card.front : '',
    back: card.type === 'qa' ? card.back : '',
    draft: card.type === 'cloze' ? draftFromMarkup(card.text) : EMPTY_DRAFT,
    title: card.type === 'schema' ? card.title : '',
    points: card.type === 'schema' ? pointsToDraft(card.points) : [],
    cover:
      card.type === 'cover'
        ? {
            ...EMPTY_COVER,
            mediaId: card.mediaId,
            masks: card.masks,
            everUsed: Math.max(0, ...card.masks.map((m) => m.n)),
          }
        : EMPTY_COVER,
    source: card.source ?? null,
    norm: card.norm,
    tags: formatTags(card.tags),
    note: card.note ?? '',
  };
}
