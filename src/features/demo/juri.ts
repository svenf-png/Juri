/** Demo-Datei zum Import (M10): nur in der Testinstanz, damit Teilen ohne zweites Gerät prüfbar ist. */
import { DEMO_JURI_NAME, DEMO_JURI_TIME, demoJuriBytes } from '@/demo/demoJuri';
import { JURI_MIME } from '@/domain/juri/format';
import skriptUrl from '../../../testdaten/demo-skript.pdf?url';
import { deliverFile, type DeliverOutcome } from '../share/deliver';

/** Baut die Datei (lädt dafür das Demo-PDF); danach folgt „Teilen“ in einem eigenen Tippen. */
export async function prepareDemoJuri(): Promise<File> {
  const pdf = new Uint8Array(await (await fetch(skriptUrl)).arrayBuffer());
  return new File([demoJuriBytes(pdf)], DEMO_JURI_NAME, {
    type: JURI_MIME,
    lastModified: DEMO_JURI_TIME,
  });
}

export function saveDemoJuri(file: File): Promise<DeliverOutcome> {
  return deliverFile(file);
}
