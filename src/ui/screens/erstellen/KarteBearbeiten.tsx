import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { cardTitle, CARD_TYPE_LABEL } from '@/domain/cards/card';
import { clozeNumbers } from '@/domain/cards/cloze';
import { numericDate } from '@/domain/format/date';
import { deckLabel } from '@/domain/library/library';
import { changeCard, removeCard } from '@/features/library/actions';
import { useEditData } from '@/features/library/queries';
import { BackLink, Screen, ScreenTitle } from '../../components/Screen';
import { StorageError } from '../../components/StorageError';
import { useGoBack } from '../../useGoBack';
import { ConfirmSheet, StapelSheet, StapelWaehlenSheet } from '../stapel/Sheets';
import { CardScreen } from './CardScreen';
import { formFromCard } from './form';

/** Karte bearbeiten und löschen (`/karte/:cardId`). Der Kartentyp steht nach dem Anlegen fest. */
export function KarteBearbeiten() {
  const { cardId = '' } = useParams();
  const navigate = useNavigate();
  const data = useEditData(cardId);
  const [chosen, setChosen] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'pick' | 'new' | 'delete' | null>(null);
  const goBack = useGoBack('/stapel');

  if (data.status === 'error') return <StorageError />;
  if (data.status !== 'ready') return null;
  const { card, areas, decks, cardCounts } = data.value;
  if (!card) {
    return (
      <Screen>
        <BackLink to="/stapel" label="Stapel" />
        <ScreenTitle lead="Vielleicht wurde sie gelöscht.">Diese Karte gibt es nicht</ScreenTitle>
      </Screen>
    );
  }
  const deckId = chosen ?? card.deckId;
  const deck = decks.find((d) => d.id === deckId);
  const close = () => {
    setSheet(null);
  };
  const gaps = card.type === 'cloze' ? clozeNumbers(card.text).length : 1;

  return (
    <>
      <CardScreen
        mode="edit"
        initial={formFromCard(card)}
        deckLabel={deck ? deckLabel(deck, areas) : null}
        onPickDeck={() => {
          setSheet('pick');
        }}
        onClose={goBack}
        onDelete={() => {
          setSheet('delete');
        }}
        edited={`Angelegt am ${numericDate(card.createdAt)} · zuletzt geändert am ${numericDate(card.updatedAt)}`}
        onSubmit={async (fields) => {
          await changeCard(card.id, deckId, fields);
          goBack();
          return true;
        }}
      />
      {sheet === 'pick' ? (
        <StapelWaehlenSheet
          areas={areas}
          decks={decks}
          cardCounts={cardCounts}
          selectedId={deckId}
          onPick={(id) => {
            setChosen(id);
            close();
          }}
          onNew={() => {
            setSheet('new');
          }}
          onClose={close}
        />
      ) : null}
      {sheet === 'new' ? (
        <StapelSheet
          areas={areas}
          decks={decks}
          onClose={close}
          onSaved={(id) => {
            setChosen(id);
            close();
          }}
        />
      ) : null}
      {sheet === 'delete' ? (
        <ConfirmSheet
          eyebrow="Karte löschen"
          title="Diese Karte löschen?"
          preview={{ type: CARD_TYPE_LABEL[card.type], text: cardTitle(card) }}
          text={
            card.type === 'cloze'
              ? `Damit ${gaps === 1 ? 'entfällt 1 Abfrage' : `entfallen ${String(gaps)} Abfragen`} mit ihrem Lernfortschritt. Das lässt sich nicht rückgängig machen.`
              : 'Die Karte und ihr Lernfortschritt werden gelöscht. Das lässt sich nicht rückgängig machen.'
          }
          confirmLabel="Karte löschen"
          onClose={close}
          onConfirm={async () => {
            await removeCard(card.id);
            close();
            // Zum Stapel, in dem die Karte lag (nicht zu einem nur gewählten, ungespeicherten).
            void navigate(`/stapel/${card.deckId}`, { replace: true });
          }}
        />
      ) : null}
    </>
  );
}
