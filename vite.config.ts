/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import {
  instanceForMode,
  navigateFallbackDenylist,
  type InstanceConfig,
} from './src/app/instance.ts';
import { CONTENT_SECURITY_POLICY } from './src/app/security.ts';
import { tokensToCss } from './src/ui/tokens/css.ts';
import { colors, tokens } from './src/ui/tokens/tokens.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const tokensCssPath = `${root}src/ui/tokens/tokens.css`;
const pkg = JSON.parse(readFileSync(`${root}package.json`, 'utf8')) as { version: string };

function commitHash(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'lokal';
  }
}

const build = { version: pkg.version, commit: commitHash(), date: new Date().toISOString() };

/** Schreibt tokens.css aus tokens.ts, sobald Dev-Server oder Build starten. */
function tokensPlugin(): Plugin {
  return {
    name: 'juri-tokens',
    buildStart() {
      const css = tokensToCss(tokens);
      const current = existsSync(tokensCssPath) ? readFileSync(tokensCssPath, 'utf8') : '';
      if (current !== css) writeFileSync(tokensCssPath, css);
    },
  };
}

/** Setzt instanzabhängige Werte in index.html und im Build die Content-Security-Policy. */
function htmlPlugin(instance: InstanceConfig, isBuild: boolean): Plugin {
  return {
    name: 'juri-html',
    transformIndexHtml(html) {
      let out = html
        .replaceAll('__JURI_TITLE__', instance.name)
        .replaceAll('__JURI_APPLE_ICON__', `${instance.base}icons/${instance.iconPrefix}-180.png`)
        .replaceAll('__JURI_ICON_32__', `${instance.base}icons/${instance.iconPrefix}-32.png`);
      if (isBuild) {
        out = out.replace(
          '<meta charset="utf-8" />',
          `<meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
        );
      }
      return out;
    },
  };
}

export default defineConfig(({ mode, command }) => {
  const instance = instanceForMode(mode);
  const isBuild = command === 'build';
  const icon = (size: number, purpose?: 'maskable') => ({
    src: `icons/${instance.iconPrefix}-${purpose === 'maskable' ? 'maskable-' : ''}${size}.png`,
    sizes: `${size}x${size}`,
    type: 'image/png',
    ...(purpose ? { purpose } : {}),
  });

  return {
    base: instance.base,
    define: {
      __JURI_INSTANCE__: JSON.stringify(instance.id),
      __JURI_BUILD__: JSON.stringify(build),
    },
    resolve: {
      alias: { '@': `${root}src` },
    },
    build: {
      outDir: instance.outDir,
      emptyOutDir: true,
      target: 'safari18',
      modulePreload: { polyfill: false },
      sourcemap: true,
    },
    plugins: [
      tokensPlugin(),
      htmlPlugin(instance, isBuild),
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false,
        manifestFilename: 'manifest.webmanifest',
        manifest: {
          id: instance.base,
          name: instance.name,
          short_name: instance.name,
          description: 'Karteikarten für das juristische Referendariat',
          lang: 'de',
          dir: 'ltr',
          start_url: instance.base,
          scope: instance.base,
          display: 'standalone',
          orientation: 'any',
          background_color: colors.bg,
          theme_color: colors.bg,
          icons: [icon(192), icon(512), icon(512, 'maskable')],
        },
        workbox: {
          cacheId: instance.cacheId,
          globPatterns: ['**/*.{js,mjs,css,html,woff2,png,svg,webmanifest,txt}'],
          // Der Worker von pdf.js im Betrieb ist die .mjs-Datei (Vite `?url`, siehe platform/pdf/pdf.ts);
          // eine zweite Kopie als .js-Chunk entsteht aus dem Rückfall von pdf.js und bleibt aus dem
          // Zwischenspeicher (1,2 MB gespart).
          globIgnores: ['test/**', '404.html', '**/*.map', '**/pdf.worker.min-*.js'],
          navigateFallback: `${instance.base}index.html`,
          navigateFallbackDenylist: navigateFallbackDenylist(instance),
          cleanupOutdatedCaches: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        devOptions: { enabled: false },
      }),
    ],
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/vite-env.d.ts'],
        // Definition of Done: Fachlogik zu mindestens 90 % abgedeckt.
        thresholds: {
          'src/domain/**': { statements: 90, branches: 90, functions: 90, lines: 90 },
        },
      },
    },
  };
});
