import { expect, test } from '@playwright/test';
import { watchPage } from './helpers';

test.describe('Testinstanz (/Juri/test/)', () => {
  test('zeigt das Hinweisband und eigenes Icon', async ({ page }) => {
    await page.goto('/Juri/test/');
    await expect(page.getByText('Testinstanz · keine echten Lerndaten')).toBeVisible();
    await expect(page).toHaveTitle('Juri Test');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
      'href',
      '/Juri/test/icons/test-180.png',
    );
  });

  test('hat ein eigenes Manifest mit eigenem Bereich', async ({ request }) => {
    const manifest = (await (await request.get('/Juri/test/manifest.webmanifest')).json()) as {
      id: string;
      name: string;
      scope: string;
      start_url: string;
    };
    expect(manifest).toMatchObject({
      id: '/Juri/test/',
      name: 'Juri Test',
      scope: '/Juri/test/',
      start_url: '/Juri/test/',
    });
  });

  test('Deep Link auf den Geräte-Check landet in der Testinstanz', async ({ page, baseURL }) => {
    const watch = watchPage(page, baseURL!, { allow404: true });
    await page.goto('/Juri/test/geraetecheck');
    await expect(page.getByRole('heading', { name: 'Geräte-Check', level: 1 })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/Juri/test/geraetecheck');
    await expect(page.getByTestId('check-standalone')).toContainText('nein');
    await expect(page.getByTestId('check-quota')).toBeVisible();
    await expect(page.getByTestId('report')).toContainText('Instanz: test');
    expect(watch.errors).toEqual([]);
    expect(watch.foreign).toEqual([]);
  });

  test('Datenbank-Test schreibt und liest 50 MB', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/Juri/test/geraetecheck');
    await page.getByRole('button', { name: '50-MB-Test starten' }).click();
    await expect(page.getByTestId('check-blob')).toContainText('intakt', { timeout: 45_000 });
  });

  test('Marker übersteht einen Neustart der Seite', async ({ page }) => {
    await page.goto('/Juri/test/geraetecheck');
    await page.getByRole('button', { name: 'Marker setzen' }).click();
    await expect(page.getByTestId('check-marker')).toContainText('vorhanden');
    await page.reload();
    await expect(page.getByTestId('check-marker')).toContainText('vorhanden');
    await page.getByRole('button', { name: 'Marker löschen' }).click();
    await expect(page.getByTestId('check-marker')).toContainText('kein Marker');
  });

  test('erkennt eine gewählte .juri-Testdatei', async ({ page }) => {
    await page.goto('/Juri/test/geraetecheck');
    // Die Testdatei entsteht im Test selbst, unabhängig vom App-Code:
    // ein ZIP (ohne Kompression) mit manifest.json und der Geräte-Check-Kennung.
    const manifest = JSON.stringify({ format: 'juri-geraetecheck' });
    const zip = await page.evaluate(async (text) => {
      const enc = new TextEncoder().encode(text);
      // Minimaler ZIP-Container (Methode 0, ohne Kompression) mit manifest.json.
      const name = new TextEncoder().encode('manifest.json');
      const crcTable = Array.from({ length: 256 }, (_, n) => {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        return c >>> 0;
      });
      let crc = 0xffffffff;
      for (const b of enc) crc = (crcTable[(crc ^ b) & 0xff] ?? 0) ^ (crc >>> 8);
      crc = (crc ^ 0xffffffff) >>> 0;
      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, enc.length, true);
      local.setUint32(22, enc.length, true);
      local.setUint16(26, name.length, true);
      const central = new DataView(new ArrayBuffer(46));
      central.setUint32(0, 0x02014b50, true);
      central.setUint16(4, 20, true);
      central.setUint16(6, 20, true);
      central.setUint32(16, crc, true);
      central.setUint32(20, enc.length, true);
      central.setUint32(24, enc.length, true);
      central.setUint16(28, name.length, true);
      const localSize = 30 + name.length + enc.length;
      const end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true);
      end.setUint16(8, 1, true);
      end.setUint16(10, 1, true);
      end.setUint32(12, 46 + name.length, true);
      end.setUint32(16, localSize, true);
      const parts = [local.buffer, name, enc, central.buffer, name, end.buffer];
      const blob = new Blob(parts);
      return Array.from(new Uint8Array(await blob.arrayBuffer()));
    }, manifest);
    await page.getByLabel('Datei wählen (ohne Filter)').setInputFiles({
      name: 'Stapel.juri',
      mimeType: '',
      buffer: Buffer.from(zip),
    });
    await expect(page.getByTestId('check-datei-ohne')).toContainText('Testdatei erkannt');
  });
});
