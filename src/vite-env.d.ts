/// <reference types="vite/client" />

/** Instanz dieses Builds, gesetzt in vite.config.ts (siehe src/app/instance.ts). */
declare const __JURI_INSTANCE__: 'app' | 'test';

/** Version, Commit und Zeitpunkt dieses Builds, gesetzt in vite.config.ts. */
declare const __JURI_BUILD__: { version: string; commit: string; date: string };

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
