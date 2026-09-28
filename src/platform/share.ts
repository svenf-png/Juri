/** Web Share API mit Dateien (iOS 15+). Auf iOS nur mit reinem `files`-Objekt zuverlässig. */

export type ShareOutcome =
  'geteilt' | 'abgebrochen' | 'nicht erlaubt' | 'nicht verfügbar' | 'Fehler';

type ShareNavigator = Pick<Navigator, 'share' | 'canShare'>;

export function canShareFiles(nav: Partial<ShareNavigator>, files: File[]): boolean {
  if (typeof nav.canShare !== 'function') return false;
  try {
    return nav.canShare({ files });
  } catch {
    return false;
  }
}

export async function shareFiles(
  nav: Partial<ShareNavigator>,
  files: File[],
): Promise<ShareOutcome> {
  if (typeof nav.share !== 'function') return 'nicht verfügbar';
  try {
    await nav.share({ files });
    return 'geteilt';
  } catch (error) {
    return classifyShareError(error);
  }
}

export function classifyShareError(error: unknown): ShareOutcome {
  const name = error instanceof DOMException || error instanceof Error ? error.name : '';
  if (name === 'AbortError') return 'abgebrochen';
  if (name === 'NotAllowedError') return 'nicht erlaubt';
  return 'Fehler';
}

/** Fallback ohne Teilen-Menü: Datei über einen Download-Link anbieten. */
export function downloadFile(doc: Document, file: File): void {
  const url = URL.createObjectURL(file);
  const a = doc.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
