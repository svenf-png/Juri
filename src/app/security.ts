/**
 * Content-Security-Policy der gebauten App (ADR-005).
 *
 * GitHub Pages erlaubt keine eigenen HTTP-Header, daher wird die Richtlinie als Meta-Tag
 * ausgeliefert. `frame-ancestors` wirkt per Meta-Tag nicht; den Schutz gegen Einbetten
 * übernimmt `isEmbedded()` beim Start.
 *
 * Keine fremden Origins: Die App lädt zur Laufzeit nur Dateien vom eigenen Origin
 * (Briefing, Definition of Done).
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-src 'none'",
].join('; ');

/** true, wenn Juri in einem fremden Frame läuft. Dann rendert die App nicht. */
export function isEmbedded(win: { readonly self: unknown; readonly top: unknown }): boolean {
  try {
    return win.self !== win.top;
  } catch {
    // Zugriff auf window.top aus einem fremden Origin wirft: dann sind wir eingebettet.
    return true;
  }
}
