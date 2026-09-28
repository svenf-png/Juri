/**
 * GitHub Pages kennt keine Weiterleitung auf index.html. Unbekannte Pfade liefern 404.html,
 * die auf `<base>?p=<pfad>&q=<query>` umleitet (scripts/postbuild.mjs). Beim Start stellt
 * die App daraus die ursprüngliche Adresse wieder her, bevor der Router sie liest.
 */
export function deepLinkTarget(search: string, hash: string, base: string): string | null {
  const params = new URLSearchParams(search);
  const path = params.get('p');
  if (path === null) return null;

  const clean = path.replace(/^\/+/, '');
  // Nur Pfade innerhalb der App zulassen, keine Schemata oder Protokoll-relativen Adressen.
  if (/^[a-z][a-z0-9+.-]*:/i.test(clean) || clean.includes('\\')) return base;

  const query = params.get('q');
  return `${base}${clean}${query ? `?${query}` : ''}${hash}`;
}

export function restoreDeepLink(
  location: Pick<Location, 'search' | 'hash'>,
  history: Pick<History, 'replaceState'>,
  base: string,
): void {
  const target = deepLinkTarget(location.search, location.hash, base);
  if (target !== null) history.replaceState(null, '', target);
}

/** Skript für 404.html. Wird von scripts/postbuild.mjs eingesetzt; hier, damit es getestet ist. */
export function notFoundRedirectScript(appBase: string, testBase: string): string {
  return `(function () {
  var l = window.location;
  var p = l.pathname;
  var base = p.indexOf(${JSON.stringify(testBase)}) === 0 ? ${JSON.stringify(testBase)} : ${JSON.stringify(appBase)};
  if (p.indexOf(base) !== 0) return;
  var rest = p.slice(base.length);
  var q = l.search ? '&q=' + encodeURIComponent(l.search.slice(1)) : '';
  l.replace(base + '?p=' + encodeURIComponent(rest) + q + l.hash);
})();`;
}
