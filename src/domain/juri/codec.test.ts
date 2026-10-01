import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { encodeBackup } from '../backup/codec';
import { decodeJuri, encodeJuri } from './codec';
import { omit } from './omit';
import { JURI_LIMITS, JuriError } from './format';
import { NOW, SOURCE, pack, qa } from './testkit';
import { buildPackage } from './build';

/** ZIP mit gültigem Manifest und Karten, aber frei wählbaren Ergänzungen. */
function zipWith(mutate: (entries: Record<string, Uint8Array>) => void, base = pack()) {
  const entries: Record<string, Uint8Array> = {
    'manifest.json': strToU8(JSON.stringify(base.manifest)),
    'cards.json': strToU8(
      JSON.stringify({
        decks: base.decks,
        cards: base.cards,
        media: base.media.map((m) => omit(m, 'data')),
      }),
    ),
  };
  for (const m of base.media) {
    const ext = m.mime === 'application/pdf' ? 'pdf' : 'jpg';
    entries[`media/${m.id}.${ext}`] = new Uint8Array(m.data);
  }
  mutate(entries);
  return zipSync(entries);
}

const rejects = (bytes: Uint8Array, code: string) => {
  try {
    decodeJuri(bytes);
  } catch (error) {
    expect(error).toBeInstanceOf(JuriError);
    expect((error as JuriError).code).toBe(code);
    return;
  }
  throw new Error(`nicht abgelehnt, erwartet: ${code}`);
};

const json = (entries: Record<string, Uint8Array>, name: string) =>
  JSON.parse(new TextDecoder().decode(entries[name])) as Record<string, unknown>;

describe('Roundtrip', () => {
  it('liefert nach Kodieren und Dekodieren denselben Inhalt', () => {
    const original = pack(['deck-a', 'deck-b'], { notes: true });
    const back = decodeJuri(encodeJuri(original));
    expect(back.manifest).toEqual(original.manifest);
    expect(back.decks).toEqual(original.decks);
    expect(back.cards).toEqual(original.cards);
    expect(back.media.map((m) => [m.id, m.kind, m.mime, m.name, m.size])).toEqual(
      original.media.map((m) => [m.id, m.kind, m.mime, m.name, m.size]),
    );
    expect(new Uint8Array(back.media[0]!.data)).toEqual(new Uint8Array(original.media[0]!.data));
  });

  it('kodiert deterministisch: gleicher Inhalt, gleiche Bytes', () => {
    expect(encodeJuri(pack())).toEqual(encodeJuri(pack()));
  });

  it('legt Medien nur einmal ab, auch wenn mehrere Karten sie nutzen', () => {
    const shared = pack(['deck-a', 'deck-b']);
    expect(shared.media.map((m) => m.id).sort()).toEqual(['doc1', 'img1']);
    expect(decodeJuri(encodeJuri(shared)).cards.filter((c) => c.type === 'cover')).toHaveLength(2);
  });

  it('nimmt einen Stapel ohne Karten und ohne Absender an', () => {
    const source = { ...SOURCE, cards: [], media: [] };
    const empty = buildPackage(source, {
      deckIds: ['deck-a'],
      notes: false,
      achievements: null,
      now: NOW,
      appVersion: '0.11.0',
    }).pack;
    const back = decodeJuri(encodeJuri(empty));
    expect(back.cards).toHaveLength(0);
    expect(back.manifest.sender).toBeUndefined();
  });

  it('reicht Erfolge und High fives durch', () => {
    const withExtras = buildPackage(SOURCE, {
      deckIds: ['deck-a'],
      notes: false,
      achievements: { streak: 5, reviews: 200, created: 30, milestones: ['erste-karte'] },
      highFives: [{ id: 'h1', at: 1, win: 'Weiter so' }],
      now: NOW,
      appVersion: '0.11.0',
    }).pack;
    const back = decodeJuri(encodeJuri(withExtras));
    expect(back.manifest.achievements?.streak).toBe(5);
    expect(back.manifest.highFives).toEqual([{ id: 'h1', at: 1, win: 'Weiter so' }]);
  });

  it('verwirft den Herkunftsstand aus einer fremden Datei', () => {
    const base = pack();
    const forged = {
      ...base,
      cards: base.cards.map((c) => ({ ...c, originHash: '0123456789abcdef' })),
    };
    const back = decodeJuri(encodeJuri(forged));
    expect(back.cards.every((c) => c.originHash === undefined)).toBe(true);
  });
});

describe('fremde und manipulierte Dateien', () => {
  it('lehnt eine leere Datei ab', () => rejects(new Uint8Array(0), 'leer'));
  it('lehnt Bytes ohne ZIP-Signatur ab', () => rejects(strToU8('Hallo Welt'), 'kein-juri'));
  it('lehnt ein ZIP ohne Manifest ab', () =>
    rejects(zipSync({ 'x.txt': strToU8('x') }), 'kein-juri'));
  it('lehnt ein Manifest mit fremdem Format ab', () =>
    rejects(zipSync({ 'manifest.json': strToU8('{"format":"anderes"}') }), 'kein-juri'));
  it('lehnt ein Manifest ab, das kein Objekt ist', () =>
    rejects(zipSync({ 'manifest.json': strToU8('[1]') }), 'kein-juri'));
  it('erkennt ein Backup und sagt es', () => {
    const backup = encodeBackup({
      schemaVersion: 7,
      createdAt: NOW,
      app: { instance: 'app', version: '0.11.0' },
      tables: {},
    });
    rejects(backup, 'ist-backup');
  });
  it('lehnt eine Datei aus einer neueren Version ab', () => {
    const entries = zipWith((e) => {
      e['manifest.json'] = strToU8(
        JSON.stringify({ ...json(e, 'manifest.json'), formatVersion: 2 }),
      );
    });
    rejects(entries, 'neuere-version');
  });
  it('lehnt ein beschädigtes Manifest ab', () =>
    rejects(zipSync({ 'manifest.json': strToU8('{kaputt') }), 'beschaedigt'));
  it('lehnt ein ZIP mit Signatur, aber ohne Inhalt ab', () =>
    rejects(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6]), 'beschaedigt'));
  it('lehnt fehlende cards.json ab', () =>
    rejects(
      zipWith((e) => {
        delete e['cards.json'];
      }),
      'beschaedigt',
    ));
  it('lehnt cards.json ab, die kein gültiges JSON ist', () =>
    rejects(
      zipWith((e) => {
        e['cards.json'] = strToU8('nichts');
      }),
      'beschaedigt',
    ));
  it('lehnt unbekannte Felder ab', () =>
    rejects(
      zipWith((e) => {
        e['manifest.json'] = strToU8(JSON.stringify({ ...json(e, 'manifest.json'), extra: 1 }));
      }),
      'beschaedigt',
    ));
  it('lehnt Pfade mit ".." in media/ ab', () =>
    rejects(
      zipWith((e) => {
        e['media/../evil.jpg'] = new Uint8Array([0xff, 0xd8, 0xff, 1]);
      }),
      'beschaedigt',
    ));
  it('lehnt absolute Pfade, Rückwärtsstriche und Verzeichniseinträge ab', () => {
    for (const name of ['/etc/passwd', 'media\\x.jpg', 'media/', 'media/a/b.jpg', 'notiz.txt']) {
      rejects(
        zipWith((e) => {
          e[name] = strToU8('x');
        }),
        'beschaedigt',
      );
    }
  });
  it('lehnt eine Mediendatei ohne Beschreibung ab', () =>
    rejects(
      zipWith((e) => {
        e['media/frei.jpg'] = new Uint8Array([0xff, 0xd8, 0xff, 1]);
      }),
      'beschaedigt',
    ));
  it('lehnt ein Medium ab, dessen Datei fehlt', () =>
    rejects(
      zipWith((e) => {
        delete e['media/img1.jpg'];
      }),
      'beschaedigt',
    ));
  it('lehnt ein Medium ab, dessen Bytes nicht zur Art passen', () =>
    rejects(
      zipWith((e) => {
        e['media/img1.jpg'] = strToU8('kein Bild, aber 64 Bytes lang'.padEnd(64, '.'));
      }),
      'beschaedigt',
    ));
  it('lehnt ein Medium ab, dessen Größe nicht stimmt', () =>
    rejects(
      zipWith((e) => {
        e['media/img1.jpg'] = new Uint8Array([0xff, 0xd8, 0xff, 1]);
      }),
      'beschaedigt',
    ));
  it('lehnt einen unbekannten MIME-Typ ab', () =>
    rejects(
      zipWith((e) => {
        const file = json(e, 'cards.json') as { media: { mime: string }[] };
        file.media[0]!.mime = 'text/html';
        e['cards.json'] = strToU8(JSON.stringify(file));
      }),
      'beschaedigt',
    ));

  const edit = (
    change: (
      file: {
        cards: Record<string, unknown>[];
        decks: Record<string, unknown>[];
        media: Record<string, unknown>[];
      },
      manifest: Record<string, unknown>,
    ) => void,
  ) =>
    zipWith((e) => {
      const file = json(e, 'cards.json') as never;
      const manifest = json(e, 'manifest.json');
      change(file, manifest);
      e['cards.json'] = strToU8(JSON.stringify(file));
      e['manifest.json'] = strToU8(JSON.stringify(manifest));
    });

  it('lehnt Verweise ins Leere ab: Verknüpfung, Stapel, Abdeckung, PDF', () => {
    rejects(
      edit((f) => {
        const s = f.cards.find((c) => c.type === 'schema') as { points: { link?: string }[] };
        s.points[0]!.link = 'gibt-es-nicht';
      }),
      'beschaedigt',
    );
    rejects(
      edit((f) => {
        f.cards[0]!.deckId = 'gibt-es-nicht';
      }),
      'beschaedigt',
    );
    rejects(
      edit((f) => {
        (f.cards.find((c) => c.type === 'cover') as { mediaId: string }).mediaId = 'weg';
      }),
      'beschaedigt',
    );
    rejects(
      edit((f) => {
        const c = f.cards.find((x) => x.type === 'cover') as { source: { mediaId: string } };
        c.source.mediaId = 'img1';
      }),
      'beschaedigt',
    );
  });
  it('lehnt eine Verknüpfung auf die eigene Karte ab', () =>
    rejects(
      edit((f) => {
        const s = f.cards.find((c) => c.type === 'schema') as {
          id: string;
          points: { link?: string }[];
        };
        s.points[0]!.link = s.id;
      }),
      'beschaedigt',
    ));
  it('lehnt doppelte Karten-IDs, unsichere IDs und falsche Zahlen ab', () => {
    rejects(
      edit((f) => void (f.cards[1]!.id = f.cards[0]!.id as string)),
      'beschaedigt',
    );
    rejects(
      edit((f) => void (f.cards[0]!.id = '../x')),
      'beschaedigt',
    );
    rejects(
      edit((_f, m) => void ((m.counts as { cards: number }).cards = 99)),
      'beschaedigt',
    );
    rejects(
      edit((_f, m) => void ((m.decks as { cards: number }[])[0]!.cards = 1)),
      'beschaedigt',
    );
    rejects(
      edit((_f, m) => void ((m.decks as { name: string }[])[0]!.name = 'Anders')),
      'beschaedigt',
    );
  });
  it('lehnt ein nicht genutztes Medium ab', () =>
    rejects(
      edit((f) => {
        f.cards = f.cards.filter((c) => c.type !== 'cover');
        (f.decks as unknown[]).length = 1;
      }),
      'beschaedigt',
    ));
  it('lehnt Notizen ab, wenn das Manifest sagt, es gebe keine', () => {
    const withNote = pack(['deck-b'], { notes: true });
    const bytes = zipWith((e) => {
      e['manifest.json'] = strToU8(JSON.stringify({ ...withNote.manifest, notes: false }));
    }, withNote);
    rejects(bytes, 'beschaedigt');
  });
  it('lehnt Datensätze ab, die gegen ein Schema verstoßen', () =>
    rejects(
      edit((f) => {
        f.cards[0]!.front = '';
      }),
      'beschaedigt',
    ));
  it('lehnt einen Absender mit Leerraum am Rand ab', () =>
    rejects(
      edit((_f, m) => void (m.sender = { name: ' Mara ' })),
      'beschaedigt',
    ));
});

describe('Grenzen', () => {
  const tight = { ...JURI_LIMITS };
  const limited = (bytes: Uint8Array, limits: Partial<typeof JURI_LIMITS>) => {
    try {
      decodeJuri(bytes, { ...tight, ...limits });
    } catch (error) {
      return (error as JuriError).code;
    }
    return 'ok';
  };

  it('lehnt zu viele Einträge ab', () =>
    expect(limited(encodeJuri(pack()), { maxEntries: 2 })).toBe('zu-gross'));
  it('lehnt zu große Gesamtgröße ab', () =>
    expect(limited(encodeJuri(pack()), { maxBytes: 100 })).toBe('zu-gross'));
  it('lehnt ein zu großes Medium ab', () =>
    expect(limited(encodeJuri(pack()), { maxMediaBytes: 10 })).toBe('zu-gross'));
  it('lehnt zu große cards.json und Manifest ab', () => {
    expect(limited(encodeJuri(pack()), { maxJsonBytes: 10 })).toBe('zu-gross');
    expect(limited(encodeJuri(pack()), { maxManifestBytes: 10 })).toBe('zu-gross');
  });
  it('lehnt eine Zip-Bombe ab: enorm gepackt, weit über dem Verhältnis', () => {
    const bomb = zipSync({ 'media/a.jpg': new Uint8Array(3_000_000) });
    expect(limited(bomb, { maxRatio: 100 })).toBe('zu-gross');
  });
  it('lehnt eine Datei ab, deren Kopf eine andere Größe angibt als der Inhalt', () => {
    const bytes = zipSync({ 'manifest.json': strToU8('{"format":"juri"}') });
    // Größenangabe im zentralen Verzeichnis fälschen: unkomprimierte Größe um 1 erhöhen.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < bytes.length - 4; i += 1) {
      if (view.getUint32(i, true) === 0x02014b50)
        view.setUint32(i + 24, view.getUint32(i + 24, true) + 1, true);
    }
    expect(limited(bytes, {})).toBe('beschaedigt');
  });
  it('lehnt zu viele Karten ab', () => {
    const many = {
      ...pack(),
      cards: Array.from({ length: JURI_LIMITS.maxCards + 1 }, (_, i) =>
        qa(`x${String(i)}`, 'deck-a'),
      ),
    };
    rejects(
      zipWith((e) => {
        e['cards.json'] = strToU8(
          JSON.stringify({ decks: many.decks, cards: many.cards, media: [] }),
        );
      }),
      'beschaedigt',
    );
  });
});
