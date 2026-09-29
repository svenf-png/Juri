/**
 * Tastenkürzel außerhalb des Lernens (dort sitzen sie in `ui/screens/lernen`, M4). Rein: Die
 * Bildschirme reichen die Taste samt Zustand herein und führen die Aktion aus.
 */

export interface KeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey?: boolean;
  /** Fokus in einem Eingabefeld, Textbereich oder Auswahlfeld. */
  editable: boolean;
}

/** Strg (Windows, Linux) oder Cmd (Mac) allein, ohne Alt. */
function mod(input: KeyInput): boolean {
  return (input.ctrlKey || input.metaKey) && !input.altKey;
}

/** Kürzel in Formularen: Strg oder Cmd plus Eingabe speichert, auch aus einem Textfeld heraus. */
export function formShortcut(input: KeyInput): 'save' | null {
  return input.key === 'Enter' && mod(input) ? 'save' : null;
}

export type ShellAction = 'new-card' | 'search';

/** Kürzel der Oberfläche: „n“ legt eine Karte an, „/“ sucht. Nie, während getippt wird. */
export function shellShortcut(input: KeyInput): ShellAction | null {
  if (input.editable || input.ctrlKey || input.metaKey || input.altKey) return null;
  if (input.key === 'n') return 'new-card';
  if (input.key === '/') return 'search';
  return null;
}

/** Kürzel auf der Fristen-Seite: „f“ legt eine Frist an. Nie, während getippt wird. */
export function deadlinesShortcut(input: KeyInput): 'new-deadline' | null {
  if (input.editable || input.ctrlKey || input.metaKey || input.altKey) return null;
  return input.key === 'f' ? 'new-deadline' : null;
}

export type PdfAction =
  'previous' | 'next' | 'first' | 'last' | 'zoom-in' | 'zoom-out' | 'zoom-reset';

/**
 * Kürzel der PDF-Ansicht: Bild auf/ab und Pfeile blättern, Pos1/Ende springen, „+“, „−“, „0“
 * zoomen. Mit Strg oder Cmd bleibt es beim Browser (Seitenzoom), im Eingabefeld beim Tippen.
 */
export function pdfShortcut(input: KeyInput): PdfAction | null {
  if (input.editable || input.ctrlKey || input.metaKey || input.altKey) return null;
  switch (input.key) {
    case 'PageUp':
    case 'ArrowLeft':
      return 'previous';
    case 'PageDown':
    case 'ArrowRight':
      return 'next';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    case '+':
    case '=':
      return 'zoom-in';
    case '-':
    case '_':
      return 'zoom-out';
    case '0':
      return 'zoom-reset';
    default:
      return null;
  }
}
