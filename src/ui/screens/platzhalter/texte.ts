export interface PlatzhalterProps {
  title: string;
  milestone: string;
  text: string;
  /** Zurück zu Heute (für Bildschirme außerhalb von Tab-Bar und Sidebar). */
  back?: boolean;
}

/** Platzhalter je Pfad; die Texte sagen, was dort entsteht. */
export const PLATZHALTER = {
  fristen: {
    title: 'Fristen',
    milestone: 'M7',
    text: 'Hier trägst du bald Klausuren und Prüfungen ein; Juri plant die Wiederholungen danach.',
  },
  erfolge: {
    title: 'Erfolge',
    milestone: 'M8',
    text: 'Hier siehst du bald deine Serie, deine Lerntage und erreichte Meilensteine.',
  },
  teilen: {
    title: 'Teilen',
    milestone: 'M9',
    text: 'Hier teilst du bald Stapel als Datei und empfängst Stapel von anderen.',
  },
  highFives: {
    title: 'High fives',
    milestone: 'M10',
    text: 'Hier gibst und bekommst du bald High fives für gemeinsames Lernen.',
  },
} satisfies Record<string, PlatzhalterProps>;
