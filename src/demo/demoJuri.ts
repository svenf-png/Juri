/**
 * Demo-Datei zum Import (M10, Entscheidung 10): `testdaten/demo-amtshaftung.juri` mit zwei Stapeln,
 * Notizen, einer Absender-ID mit einem High five, einem Bild mit Abdeckung, einem PDF als Herkunft und Verknüpfungen zwischen Schema und
 * Karten. So lässt sich Teilen und Import in der Testinstanz ohne zweites Gerät prüfen. Alles
 * deterministisch: gleiche Eingabe, gleiche Bytes.
 */
import { buildPackage, type ExportSource } from '@/domain/juri/build';
import { encodeJuri } from '@/domain/juri/codec';
import type { JuriPackage } from '@/domain/juri/format';
import type { Card, MediaRecord } from '@/domain/model/records';
import { demoDecks } from './demoDecks';
import { blocksPng } from './png';

/** Fester Zeitpunkt der Demo-Datei (29.09.2026, 10:00 UTC). */
export const DEMO_JURI_TIME = Date.UTC(2026, 8, 29, 10, 0, 0);
/** Feste Absender-ID von „Mara“ in der Demo-Datei und im Demo-Profil. */
export const DEMO_SENDER_ID = 'demo-mara';
export const DEMO_JURI_NAME = 'Demo-Amtshaftung.juri';
const DECKS = ['demo-amtshaftung', 'demo-schemata'];
const PDF_ID = 'demo-skript';
const IMAGE_ID = 'demo-schaubild';
const PDF_NAME = 'Demo-Skript Sachenrecht.pdf';

/** Schaubild: drei Balken, deren Beschriftung du beim Lernen abdeckst. */
function schaubild(): Uint8Array<ArrayBuffer> {
  const violet = [106, 63, 224] as const;
  const soft = [201, 184, 247] as const;
  return blocksPng(640, 360, [
    { x: 40, y: 40, w: 560, h: 60, color: violet },
    { x: 40, y: 150, w: 400, h: 60, color: soft },
    { x: 40, y: 260, w: 240, h: 60, color: soft },
  ]);
}

export function demoJuriSource(pdf: Uint8Array): ExportSource {
  const now = DEMO_JURI_TIME;
  const demo = demoDecks(now);
  const cards: Card[] = demo.cards
    .filter((c) => DECKS.includes(c.deckId))
    .map((c) =>
      c.id === 'demo-amtshaftung-01' || c.id === 'demo-amtshaftung-02'
        ? {
            ...c,
            note: 'Meine Merkhilfe: erst die Pflichtverletzung, dann den Anspruchsgegner prüfen.',
          }
        : c,
    );
  cards.push({
    id: 'demo-amtshaftung-schaubild',
    deckId: 'demo-amtshaftung',
    type: 'cover',
    mediaId: IMAGE_ID,
    masks: [
      { n: 1, x: 0.06, y: 0.11, w: 0.88, h: 0.17 },
      { n: 2, x: 0.06, y: 0.42, w: 0.62, h: 0.17 },
    ],
    norm: '§ 839 BGB',
    tags: ['Demo'],
    source: { name: PDF_NAME, page: 14, mediaId: PDF_ID },
    createdAt: now + 1,
    updatedAt: now + 1,
  });
  const png = schaubild();
  const media: MediaRecord[] = [
    {
      id: IMAGE_ID,
      kind: 'image',
      mime: 'image/png',
      name: 'Demo-Schaubild.png',
      size: png.byteLength,
      width: 640,
      height: 360,
      createdAt: now,
      data: png.buffer,
    },
    {
      id: PDF_ID,
      kind: 'pdf',
      mime: 'application/pdf',
      name: PDF_NAME,
      size: pdf.byteLength,
      pages: 50,
      createdAt: now,
      data: pdf.slice().buffer,
    },
  ];
  return {
    decks: demo.decks.filter((d) => DECKS.includes(d.id)),
    areas: demo.areas,
    cards,
    media,
  };
}

export function demoJuriPackage(pdf: Uint8Array): JuriPackage {
  return buildPackage(demoJuriSource(pdf), {
    deckIds: DECKS,
    notes: true,
    achievements: {
      streak: 12,
      reviews: 1284,
      created: 146,
      milestones: ['erste-karte', 'serie-7'],
    },
    senderName: 'Mara',
    // Absender-ID und ein High five ohne Empfänger (M11): Kontakt und High five lassen sich ohne
    // zweites Gerät prüfen. Die ID ist fest, die Datei bleibt deterministisch.
    senderId: DEMO_SENDER_ID,
    highFives: [{ id: 'demo-mara-hf-1', at: DEMO_JURI_TIME, win: '12 Tage in Folge' }],
    now: DEMO_JURI_TIME,
    appVersion: '0.12.0',
  }).pack;
}

export function demoJuriBytes(pdf: Uint8Array): Uint8Array<ArrayBuffer> {
  return encodeJuri(demoJuriPackage(pdf));
}
