/**
 * Datei-Dialog des Browsers. Muss synchron aus dem Tippen heraus aufgerufen werden (iOS erlaubt
 * den Dialog nur nach einer Nutzeraktion). Kein `accept`-Filter mit Endungen: iOS ignoriert sie
 * und graut sonst Dateien aus (A10); `image/*` und `application/pdf` sind MIME-Typen und gehen.
 */
export function pickFile(accept: string, doc: Document = document): Promise<File | null> {
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.hidden = true;
    let done = false;
    const finish = (file: File | null) => {
      if (done) return;
      done = true;
      input.remove();
      resolve(file);
    };
    input.addEventListener('change', () => {
      finish(input.files?.[0] ?? null);
    });
    // Abbrechen meldet „cancel“ (Safari 16.4+, Chrome, Firefox); fehlt es, bleibt das Versprechen offen.
    input.addEventListener('cancel', () => {
      finish(null);
    });
    doc.body.append(input);
    input.click();
  });
}
