/**
 * Demo-Skript der Testinstanz (M6): das 50-seitige PDF `testdaten/demo-skript.pdf` als Herkunft
 * einer Frage und einer Abdeckung, dazu ein Stapel. Zeigt PDF-Ansicht, Markieren und Abdecken mit
 * echten Dateien und dient als „großer Datensatz“ für das PDF (Architektur, Testdaten).
 */
import { checkCard, type CardFields } from '@/domain/cards/card';
import type { MediaRecord, Source } from '@/domain/model/records';
import { createArea, readAreas } from '@/data/repositories/areas';
import { createCard } from '@/data/repositories/cards';
import { createDeck, readDeck } from '@/data/repositories/decks';
import { readMedia } from '@/data/repositories/media';
import { openPdf } from '@/platform/pdf/pdf';
import skriptUrl from '../../../testdaten/demo-skript.pdf?url';
import { database } from '../app/database';

const PDF_ID = 'demo-skript';
const DECK_ID = 'demo-skript-stapel';
const NAME = 'Demo-Skript Sachenrecht.pdf';
const PAGE = 14;

/** Felder auf Seite 14 (Bruchteile der Seite): Überschrift, „grober Fahrlässigkeit“, Fundstelle. */
const MASKS = [
  { n: 1, x: 0.18, y: 0.143, w: 0.3, h: 0.038 },
  { n: 2, x: 0.64, y: 0.255, w: 0.26, h: 0.036 },
  { n: 3, x: 0.68, y: 0.29, w: 0.24, h: 0.036 },
];

function fields(form: Parameters<typeof checkCard>[0]): CardFields {
  const checked = checkCard(form);
  if (!checked.ok) throw new Error('Demo-Karte ungültig');
  return checked.fields;
}

/** Legt Stapel, PDF, Frage und Abdeckung an, falls es sie noch nicht gibt. Liefert `false`, wenn alles schon da war. */
export async function addDemoSkript(now = Date.now()): Promise<boolean> {
  const db = database();
  if ((await readDeck(db, DECK_ID)) || (await readMedia(db, PDF_ID))) return false;
  const bytes = await (await fetch(skriptUrl)).arrayBuffer();
  const doc = await openPdf(bytes);
  let image;
  try {
    image = await doc.pageImage(PAGE);
  } finally {
    await doc.destroy();
  }
  const areas = await readAreas(db);
  const zr =
    areas.find((a) => a.code === 'ZR') ??
    (await createArea(db, { id: 'demo-zr', code: 'ZR', name: 'Zivilrecht' }, now));
  await createDeck(
    db,
    { id: DECK_ID, name: 'Demo-Skript Sachenrecht', norm: '§ 932 BGB', areaIds: [zr.id] },
    now,
  );
  const pdf: MediaRecord = {
    id: PDF_ID,
    kind: 'pdf',
    mime: 'application/pdf',
    name: NAME,
    size: bytes.byteLength,
    pages: 50,
    createdAt: now,
    data: bytes,
  };
  const page: MediaRecord = {
    id: 'demo-skript-seite-14',
    kind: 'image',
    mime: 'image/jpeg',
    name: `Demo-Skript Sachenrecht S. ${String(PAGE)}`,
    size: image.data.byteLength,
    width: image.width,
    height: image.height,
    createdAt: now,
    data: image.data,
  };
  const source: Source = { name: NAME, page: PAGE, mediaId: PDF_ID };
  const base = { text: '', norm: '§ 932 II BGB', tags: '#Demo', note: '', source };
  await createCard(
    db,
    {
      id: 'demo-skript-01',
      deckId: DECK_ID,
      fields: fields({
        ...base,
        type: 'qa',
        front: 'Wann ist der Erwerber nach § 932 II BGB nicht in gutem Glauben?',
        back: 'Wenn ihm bekannt oder infolge grober Fahrlässigkeit unbekannt ist, dass die Sache nicht dem Veräußerer gehört.',
      }),
      media: [pdf],
    },
    now,
  );
  await createCard(
    db,
    {
      id: 'demo-skript-02',
      deckId: DECK_ID,
      fields: fields({
        ...base,
        type: 'cover',
        front: '',
        back: '',
        mediaId: page.id,
        masks: MASKS,
      }),
      media: [page],
    },
    now + 1,
  );
  return true;
}
