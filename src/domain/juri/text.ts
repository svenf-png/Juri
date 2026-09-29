/**
 * Texte und Kurzfassungen für Teilen und Import (Teilen.dc.html): rein, damit die Bildschirme nur
 * anzeigen. Keine Gedankenstriche, Zahlen mit deutscher Mehrzahl.
 */
import type { Environment } from '../device/environment';
import { formatBytes } from '../format/bytes';
import { initialOf } from '../profile/name';
import type { JuriPackage } from './format';
import type { Conflict, MergePlan, MergeSummary } from './merge';

const num = (n: number) => n.toLocaleString('de-DE');
const plural = (n: number, one: string, many: string) => `${num(n)} ${n === 1 ? one : many}`;

export const cardsText = (n: number) => plural(n, 'Karte', 'Karten');

export interface PackStats {
  readonly cards: number;
  readonly pdfs: number;
  readonly images: number;
}

export function packStats(pack: JuriPackage): PackStats {
  return {
    cards: pack.cards.length,
    pdfs: pack.media.filter((m) => m.kind === 'pdf').length,
    images: pack.media.filter((m) => m.kind === 'image').length,
  };
}

/** „21 Karten · 3 PDFs · 2,4 MB“; PDFs und Bilder nur, wenn es welche gibt. */
export function exportSummary(stats: PackStats, bytes: number): string {
  return [
    cardsText(stats.cards),
    ...(stats.pdfs > 0 ? [plural(stats.pdfs, 'PDF', 'PDFs')] : []),
    ...(stats.images > 0 ? [plural(stats.images, 'Bild', 'Bilder')] : []),
    formatBytes(bytes),
  ].join(' · ');
}

export interface IncomingView {
  /** Name des Stapels, bei mehreren „3 Stapel“. */
  readonly title: string;
  /** „von Mara · 27 Karten“ */
  readonly meta: string;
  /** Anfangsbuchstabe des Absenders für den Kreis; „?“ ohne Absender. */
  readonly letter: string;
  /** Stapel der Datei mit Kartenzahl, für Dateien mit mehreren. */
  readonly decks: readonly { name: string; cards: string }[];
}

export function describeIncoming(pack: JuriPackage): IncomingView {
  const name = pack.manifest.sender?.name;
  const count = cardsText(pack.cards.length);
  const [first] = pack.manifest.decks;
  return {
    title:
      pack.manifest.decks.length === 1 && first
        ? first.name
        : `${num(pack.manifest.decks.length)} Stapel`,
    meta: name ? `von ${name} · ${count}` : count,
    letter: name ? initialOf(name) : '?',
    decks: pack.manifest.decks.map((d) => ({ name: d.name, cards: cardsText(d.cards) })),
  };
}

export const COPY_HINT = 'Eigener, unabhängiger Stapel';

/** Erklärung unter „Aktualisieren“: was bei dir passiert. */
export function updateHint(summary: MergeSummary): string {
  if (summary.decksKnown === 0) return 'Der Stapel kommt neu dazu. Dein Fortschritt bleibt privat.';
  const parts = [
    ...(summary.cardsNew > 0 ? [plural(summary.cardsNew, 'neue Karte', 'neue Karten')] : []),
    ...(summary.cardsUpdated > 0
      ? [plural(summary.cardsUpdated, 'Karte geändert', 'Karten geändert')]
      : []),
  ];
  if (parts.length === 0 && summary.decksNew === 0) {
    return 'Du hast schon alles. Dein Fortschritt bleibt.';
  }
  return `Du hast den Stapel schon. ${parts.join(', ')}. Dein Fortschritt bleibt.`;
}

/** „Nichts zu importieren“, wenn ein Import nichts ändern würde. */
export const NOTHING_TO_IMPORT =
  'Alles schon auf dem neuesten Stand. Es gibt nichts zu importieren.';

export function conflictText(conflict: Conflict): { title: string; detail: string } {
  return {
    title: conflict.title,
    detail:
      conflict.kind === 'deleted'
        ? `${conflict.deckName} · Du hast die Karte gelöscht`
        : `${conflict.deckName} · Du und der Absender habt sie geändert`,
  };
}

/** Wahl je Konflikt: was „meine Version“ und „Import“ bedeuten. */
export const CONFLICT_CHOICES: Readonly<
  Record<Conflict['kind'], { mine: string; theirs: string }>
> = {
  changed: { mine: 'Meine behalten', theirs: 'Import nehmen' },
  deleted: { mine: 'Gelöscht lassen', theirs: 'Wiederherstellen' },
};

export function conflictsLead(n: number): string {
  return n === 1
    ? 'Eine Karte wurde bei dir und im Import geändert.'
    : `${num(n)} Karten wurden bei dir und im Import geändert.`;
}

/** Zeilen der Erfolgsmeldung nach dem Import. */
export function outcomeRows(summary: MergeSummary): [string, string][] {
  const rows: [string, string][] = [
    ['Neue Karten', num(summary.cardsNew)],
    ['Geändert', num(summary.cardsUpdated)],
  ];
  const kept = summary.cardsKeptMine + summary.cardsStayDeleted;
  if (kept > 0) rows.push(['Deine Version behalten', num(kept)]);
  if (summary.cardsMissingInFile > 0)
    rows.push(['Beim Absender entfernt', num(summary.cardsMissingInFile)]);
  if (summary.linksDropped > 0) rows.push(['Verknüpfungen gekappt', num(summary.linksDropped)]);
  return rows;
}

/** Erste Deck-ID im Plan, zu der „Zum Stapel“ führt: ein neuer Stapel, sonst der erste der Datei. */
export function firstDeckId(pack: JuriPackage, plan: MergePlan): string | undefined {
  return plan.writes.decks[0]?.id ?? pack.decks[0]?.id;
}

export interface ShareCopy {
  /** Beschriftung des Knopfes unter den Schaltern. */
  readonly action: string;
  /** Rückmeldung, nachdem die Datei geteilt wurde. */
  readonly shared: string;
  /** Rückmeldung, nachdem die Datei geladen wurde. */
  readonly saved: string;
  /** Die drei Schritte der Import-Anleitung. */
  readonly steps: readonly { title: string; body: string }[];
  /** Ein Satz für den Empfänger unter „Empfangen“. */
  readonly receiveHint: string;
}

/** Texte zu Teilen und Import, angepasst an Teilen-Menü (iOS, Android) oder Download (Desktop). */
export function shareCopy(environment: Environment): ShareCopy {
  if (environment === 'desktop') {
    return {
      action: 'Herunterladen',
      shared: 'Datei geteilt.',
      saved: 'Datei geladen. Schick sie weiter, sie liegt meist im Ordner „Downloads“.',
      steps: [
        {
          title: 'Datei speichern',
          body: 'Speichere die .juri-Datei auf deinem Rechner, meist landet sie im Ordner „Downloads“.',
        },
        { title: 'Juri öffnen', body: 'Komm hierher zu „Teilen“ und wähle „Datei öffnen“.' },
        { title: 'Datei wählen', body: 'Such die .juri-Datei aus und prüfe die Vorschau.' },
      ],
      receiveHint:
        'Stapel von anderen kommen als .juri-Datei. Speichere sie zuerst auf deinem Rechner.',
    };
  }
  return {
    action: 'AirDrop, Nachrichten, Mail …',
    shared: 'Datei geteilt.',
    saved: 'Datei geladen. Schick sie weiter, sie liegt in „Dateien“.',
    steps: [
      {
        title: 'In „Dateien“ sichern',
        body: 'Tippe in AirDrop, Nachrichten oder Mail auf die Datei und wähle „In Dateien sichern“.',
      },
      { title: 'Juri öffnen', body: 'Komm hierher zu „Teilen“ und tippe auf „Datei öffnen“.' },
      {
        title: 'Datei wählen',
        body: 'Wähle die .juri-Datei aus. Frisch gesicherte Dateien stehen unter „Zuletzt“ ganz oben.',
      },
    ],
    receiveHint:
      'Stapel von anderen kommen als .juri-Datei. Sichere sie zuerst in „Dateien“, dann öffnest du sie hier.',
  };
}
