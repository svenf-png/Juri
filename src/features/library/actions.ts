/**
 * Schreibende Anwendungsfälle der Bibliothek. Die Oberfläche prüft Eingaben vorher mit den
 * Regeln aus domain/ (checkCard, checkDeck, checkArea) und ruft dann diese Funktionen auf.
 */
import type { CardFields } from '@/domain/cards/card';
import { newId } from '@/platform/id';
import { createArea, deleteArea, updateArea } from '@/data/repositories/areas';
import { createCard, deleteCard, updateCard } from '@/data/repositories/cards';
import { createDeck, deleteDeck, updateDeck } from '@/data/repositories/decks';
import { database } from '../app/database';

export function addCard(deckId: string, fields: CardFields) {
  return createCard(database(), { id: newId(), deckId, fields }, Date.now());
}

export function changeCard(id: string, deckId: string, fields: CardFields) {
  return updateCard(database(), id, { deckId, fields }, Date.now());
}

export function removeCard(id: string) {
  return deleteCard(database(), id);
}

/** Neue Rechtsgebiete (`newAreas`, Kürzel und Name) entstehen mit dem Stapel; die Auswahl nennt sie mit einer vorläufigen ID. */
export function addDeck(input: {
  name: string;
  norm: string;
  areaIds: readonly string[];
  newAreas?: readonly { id: string; code: string; name: string }[];
}) {
  return createDeck(database(), { id: newId(), ...input }, Date.now());
}

export function changeDeck(
  id: string,
  changes: { name?: string; norm?: string; areaIds?: string[] },
) {
  return updateDeck(database(), id, changes, Date.now());
}

export function removeDeck(id: string) {
  return deleteDeck(database(), id);
}

export function addArea(input: { code: string; name: string }) {
  return createArea(database(), { id: newId(), ...input }, Date.now());
}

export function changeArea(id: string, input: { code: string; name: string }) {
  return updateArea(database(), id, input, Date.now());
}

export function removeArea(id: string) {
  return deleteArea(database(), id, Date.now());
}
