/** Datenmodell und Bericht des Geräte-Checks. */

export type CheckStatus = 'ok' | 'hinweis' | 'fehlt' | 'info' | 'läuft';

export interface CheckResult {
  label: string;
  value: string;
  status: CheckStatus;
}

export type Answer = 'offen' | 'ja' | 'nein';

export type SectionId =
  | 'umgebung'
  | 'speicher'
  | 'datenbank'
  | 'marker'
  | 'teilen'
  | 'dateien'
  | 'bilder'
  | 'kalender'
  | 'statusleiste'
  | 'apis';

export interface Section {
  id: SectionId;
  title: string;
  intro: string;
}

export const SECTIONS: readonly Section[] = [
  { id: 'umgebung', title: 'Umgebung', intro: 'Gerät, System und Anzeigemodus.' },
  {
    id: 'speicher',
    title: 'Speicher',
    intro: 'Ob iOS den Speicher dauerhaft schützt und wie viel Platz Juri hat.',
  },
  {
    id: 'datenbank',
    title: 'Datenbank',
    intro: 'Schreibt eine 50-MB-Datei in die lokale Datenbank, liest sie zurück und löscht sie.',
  },
  {
    id: 'marker',
    title: 'App entfernen',
    intro:
      'Prüft, ob Daten das Entfernen vom Home-Bildschirm überleben: Marker setzen, App-Symbol entfernen, neu hinzufügen, Seite öffnen, Ergebnis ablesen.',
  },
  {
    id: 'teilen',
    title: 'Teilen',
    intro:
      'Welche Dateitypen das Teilen-Menü annimmt. Tippe auf „Teilen“ und brich danach einfach ab.',
  },
  {
    id: 'dateien',
    title: 'Datei öffnen',
    intro:
      'Teile zuerst eine .juri-Datei oben per „In Dateien sichern“. Wähle sie dann hier aus, einmal ohne und einmal mit Filter.',
  },
  {
    id: 'bilder',
    title: 'Fotos',
    intro:
      'Wähle ein Foto aus der Mediathek, am besten eines im HEIC-Format (Standard der iPhone-Kamera).',
  },
  {
    id: 'kalender',
    title: 'Kalender',
    intro: 'Ein Testtermin für morgen 18:00 Uhr mit Erinnerung. Du kannst ihn danach löschen.',
  },
  {
    id: 'statusleiste',
    title: 'Statusleiste',
    intro:
      'Schaltet die Lern-Fläche (#F6F4FB) ein. Beobachte, ob die Statusleiste oben die Farbe übernimmt.',
  },
  {
    id: 'apis',
    title: 'Weitere Fähigkeiten',
    intro: 'Browser-Funktionen, die spätere Meilensteine nutzen.',
  },
];

export interface ManualQuestion {
  id: string;
  section: SectionId;
  question: string;
}

export const QUESTIONS: readonly ManualQuestion[] = [
  {
    id: 'teilen-ziele',
    section: 'teilen',
    question: 'Standen AirDrop, Nachrichten und „In Dateien sichern“ zur Wahl?',
  },
  {
    id: 'dateien-grau',
    section: 'dateien',
    question: 'Waren .juri-Dateien mit Filter ausgegraut?',
  },
  {
    id: 'kalender-angebot',
    section: 'kalender',
    question: 'Hat iOS angeboten, den Termin in den Kalender zu übernehmen?',
  },
  {
    id: 'statusleiste-farbe',
    section: 'statusleiste',
    question: 'Hat die Statusleiste die Lern-Fläche übernommen?',
  },
];

export interface ReportInput {
  generatedAt: Date;
  instance: string;
  build: string;
  results: Readonly<Record<string, CheckResult>>;
  resultSections: Readonly<Record<string, SectionId>>;
  answers: Readonly<Record<string, Answer>>;
}

const STATUS_TEXT: Record<CheckStatus, string> = {
  ok: 'OK',
  hinweis: 'HINWEIS',
  fehlt: 'FEHLT',
  info: 'INFO',
  läuft: 'LÄUFT',
};

/** Textbericht zum Kopieren oder Teilen, gegliedert nach Abschnitten. */
export function buildReport(input: ReportInput): string {
  const lines = [
    'Juri Geräte-Check',
    `Erstellt: ${input.generatedAt.toISOString()}`,
    `Instanz: ${input.instance} · Build: ${input.build}`,
  ];
  for (const section of SECTIONS) {
    const ids = Object.keys(input.results).filter((id) => input.resultSections[id] === section.id);
    const questions = QUESTIONS.filter((q) => q.section === section.id);
    if (ids.length === 0 && questions.length === 0) continue;
    lines.push('', `[${section.title}]`);
    for (const id of ids) {
      const r = input.results[id];
      if (r) lines.push(`- ${r.label}: ${r.value} (${STATUS_TEXT[r.status]})`);
    }
    for (const q of questions) {
      lines.push(`- Frage: ${q.question} → ${input.answers[q.id] ?? 'offen'}`);
    }
  }
  return lines.join('\n') + '\n';
}
