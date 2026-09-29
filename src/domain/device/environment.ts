/**
 * Umgebung, in der Juri läuft (M7, Entscheidung 12): iPhone/iPad, Desktop-Browser oder Android.
 * Daraus folgen die Regeln für „nur installiert“ (A13), Teilen und die Texte der Bedienhinweise.
 * Rein: Das Gerät kommt als Zahl und Text von außen (platform/device.ts).
 */

export type Platform = 'iPhone' | 'iPad' | 'Mac' | 'Android' | 'Andere';

export type Environment = 'ios' | 'desktop' | 'android';

/** Mac, Windows, Linux und alles Unbekannte zählen als Desktop-Browser. */
export function environmentOf(platform: Platform): Environment {
  if (platform === 'iPhone' || platform === 'iPad') return 'ios';
  if (platform === 'Android') return 'android';
  return 'desktop';
}

/**
 * Sperrbild „zuerst installieren“ (A13): nur im Safari-Tab auf iPhone und iPad, weil dort Tab und
 * Home-Bildschirm-App getrennte Speicher haben. Auf dem Desktop legt jeder Browser seine Daten
 * lokal an, ohne Sperrbild (Entscheidung 12). Ob ein installiertes Desktop-Fenster den Speicher
 * mit dem Tab teilt, hängt vom Browser ab und ist nicht geprüft (A51).
 */
export function installRequired(platform: Platform, standalone: boolean): boolean {
  return environmentOf(platform) === 'ios' && !standalone;
}

/** Wie eine Datei zum Nutzer kommt: über das Teilen-Menü des Systems oder als Download. */
export type SaveMode = 'share' | 'download';

/**
 * iOS und Android bieten ein Teilen-Menü mit „In Dateien sichern“. Auf dem Desktop öffnet Web
 * Share (wo es das gibt) ein Systemfenster statt eines Speicherorts; dort ist der Download die
 * erwartete Art, eine Datei zu sichern.
 */
export function saveMode(environment: Environment): SaveMode {
  return environment === 'desktop' ? 'download' : 'share';
}

/** Zeiger-Verb für Hinweise: Auf dem Desktop wird geklickt, sonst getippt. */
export function pointerVerbs(environment: Environment): { tap: string; tapOn: string } {
  return environment === 'desktop'
    ? { tap: 'Klicken', tapOn: 'anklicken' }
    : { tap: 'Tippen', tapOn: 'antippen' };
}

export type GestureHints = {
  /** PDF neben dem Formular: Text markieren. */
  pdfText: string;
  /** PDF neben dem Formular: Felder aufziehen. */
  pdfCover: string;
  /** Abdeckung im Editor: Zoomen. */
  zoom: string;
  /** Lernen einer Abdeckung: Zoomen und aufdecken. */
  coverStudy: string;
};

/** Bedienhinweise: Finger und Pencil auf iOS und Android, Maus, Trackpad und Tastatur auf dem Desktop. */
export function gestureHints(environment: Environment): GestureHints {
  if (environment === 'desktop') {
    return {
      pdfText: 'Text mit der Maus markieren',
      pdfCover: 'Felder mit der Maus aufziehen',
      zoom: 'Strg oder Cmd + Rad zum Zoomen',
      coverStudy: 'Strg oder Cmd + Rad zum Zoomen · Feld anklicken zum Aufdecken',
    };
  }
  return {
    pdfText: 'Markieren mit Finger oder Pencil',
    pdfCover: 'Felder mit Finger oder Pencil aufziehen',
    zoom: 'Zwei Finger zum Zoomen',
    coverStudy: 'Zwei Finger zum Zoomen · Feld antippen zum Aufdecken',
  };
}

export type FileCopy = {
  /** Text unter „Backup erstellen“. */
  backupTip: string;
  /** Text im Sheet „Backup bereit“ nach der Größe. */
  backupSheet: string;
  /** Beschriftung des Knopfes im Sheet. */
  backupAction: string;
  /** Hinweis unter „Dauerhaft gespeichert“. */
  storageHelp: string;
};

/** Texte zu Backup und Speicher, angepasst an Systemmenü (iOS, Android) oder Download (Desktop). */
export function fileCopy(environment: Environment): FileCopy {
  if (environment === 'desktop') {
    return {
      backupTip:
        'Tipp: Das Backup landet im Download-Ordner dieses Browsers. Leg es an einem sicheren Ort ab, dann hilft es auch auf einem neuen Gerät.',
      backupSheet:
        'mit Profil und allen Daten. Mit „Herunterladen“ speichert dein Browser die Datei, meist im Ordner „Downloads“.',
      backupAction: 'Herunterladen',
      storageHelp:
        'Dauerhaft gespeicherte Daten löscht der Browser nicht von sich aus, um Platz zu schaffen. Die Daten liegen nur in diesem Browser. Gegen das Löschen der Website-Daten oder den Verlust des Geräts hilft nur ein Backup.',
    };
  }
  return {
    backupTip:
      'Tipp: Beim Teilen „In Dateien sichern“ wählen. Dann liegt das Backup in iCloud Drive und hilft auch auf einem neuen Gerät.',
    backupSheet:
      'mit Profil und allen Daten. Im nächsten Schritt „In Dateien sichern“ wählen, dann liegt es in iCloud Drive.',
    backupAction: 'Sichern oder teilen',
    storageHelp:
      'Dauerhaft gespeicherte Daten löscht iOS nicht von sich aus, um Platz zu schaffen. Gegen das Löschen der App oder den Verlust des Geräts hilft nur ein Backup.',
  };
}
