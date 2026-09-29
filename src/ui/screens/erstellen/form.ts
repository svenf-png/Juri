import { formatTags } from '@/domain/cards/card';
import { draftFromMarkup, EMPTY_DRAFT, type ClozeDraft } from '@/domain/cards/clozeDraft';
import { pointsToDraft, type DraftPoint } from '@/domain/cards/schema';
import type { Card } from '@/domain/model/records';

/** Reiter des Erstellen-Bildschirms; die Abdeckung kommt mit M6. */
export type Tab = 'qa' | 'cloze' | 'schema' | 'cover';

export interface FormState {
  tab: Tab;
  front: string;
  back: string;
  draft: ClozeDraft;
  /** Schema: Titel und Gliederung. */
  title: string;
  points: DraftPoint[];
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
    norm: card.norm,
    tags: formatTags(card.tags),
    note: card.note ?? '',
  };
}
