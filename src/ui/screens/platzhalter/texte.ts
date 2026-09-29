export interface PlatzhalterProps {
  title: string;
  milestone: string;
  text: string;
  /** Zurück zu Heute (für Bildschirme außerhalb von Tab-Bar und Sidebar). */
  back?: boolean;
}

/** Platzhalter je Pfad; die Texte sagen, was dort entsteht. */
export const PLATZHALTER = {
  erfolge: {
    title: 'Erfolge',
    milestone: 'M9',
    text: 'Hier siehst du bald deine Serie, deine Lerntage und erreichte Meilensteine.',
  },
  teilen: {
    title: 'Teilen',
    milestone: 'M10',
    text: 'Hier teilst du bald Stapel als Datei und empfängst Stapel von anderen.',
  },
  highFives: {
    title: 'High fives',
    milestone: 'M11',
    text: 'Hier gibst und bekommst du bald High fives für gemeinsames Lernen.',
  },
} satisfies Record<string, PlatzhalterProps>;
