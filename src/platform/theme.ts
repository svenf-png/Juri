/** Setzt die Farbe von theme-color und Seitenhintergrund (Statusleisten-Test, später Lern-Screens). */
export function setSurfaceColor(doc: Document, color: string | null): void {
  let meta = doc.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = doc.createElement('meta');
    meta.name = 'theme-color';
    doc.head.appendChild(meta);
  }
  meta.content = color ?? '#FFFFFF';
  doc.documentElement.style.background = color ?? '';
  doc.body.style.background = color ?? '';
}
