/** Build-Kennung für Anzeige und Fehlerberichte, gesetzt in vite.config.ts. */
export const BUILD = __JURI_BUILD__;

export function buildLabel(build: { version: string; commit: string }): string {
  return `${build.version} (${build.commit})`;
}
