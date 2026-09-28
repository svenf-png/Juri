import { formatTags } from '@/domain/cards/card';
import { draftFromMarkup, EMPTY_DRAFT, type ClozeDraft } from '@/domain/cards/clozeDraft';
import type { Card } from '@/domain/model/records';

/** Reiter des Erstellen-Bildschirms; Schema und Abdeckung kommen mit M5 und M6. */
export type Tab = 'qa' | 'cloze' | 'schema' | 'cover';

export interface FormState {
  tab: Tab;
  front: string;
  back: string;
  draft: ClozeDraft;
  norm: string;
  tags: string;
  note: string;
}

export const EMPTY_FORM: FormState = {
  tab: 'qa',
  front: '',
  back: '',
  draft: EMPTY_DRAFT,
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
    norm: card.norm,
    tags: formatTags(card.tags),
    note: card.note ?? '',
  };
}
