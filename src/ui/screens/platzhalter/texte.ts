export interface PlatzhalterProps {
  title: string;
  milestone: string;
  text: string;
  /** Zurück zu Heute (für Bildschirme außerhalb von Tab-Bar und Sidebar). */
  back?: boolean;
}

/** Platzhalter je Pfad; die Texte sagen, was dort entsteht. */
export const PLATZHALTER = {
  highFives: {
    title: 'High fives',
    milestone: 'M11',
    text: 'Hier gibst und bekommst du bald High fives für gemeinsames Lernen.',
  },
} satisfies Record<string, PlatzhalterProps>;
