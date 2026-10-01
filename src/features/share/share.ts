import { BUILD } from '@/app/build';
import {
  applyMerge,
  readAchievements,
  readExportSource,
  readMergeLocal,
  recordShared,
} from '@/data/repositories/juri';
import { ensureSenderId, planSocial, readHighFives } from '@/data/repositories/highfive';
import { readMeta, readProfile, writeMeta } from '@/data/repositories/profile';
import { outgoingHighFives } from '@/domain/highfive/give';
import { socialFromManifest, type ReceivePlan } from '@/domain/highfive/incoming';
import { buildPackage, juriFileName } from '@/domain/juri/build';
import { decodeJuri, encodeJuri } from '@/domain/juri/codec';
import { JURI_LIMITS, JURI_MIME, JuriError, type JuriPackage } from '@/domain/juri/format';
import { contentHash } from '@/domain/juri/hash';
import { planMerge, type MergeMode, type MergePlan, type Resolution } from '@/domain/juri/merge';
import { packStats, type PackStats } from '@/domain/juri/text';
import { newId } from '@/platform/id';
import { database } from '../app/database';
import { deliverFile, type DeliverOutcome } from './deliver';

/** Auswahl beim Teilen: Stapel und die beiden Schalter. */
export interface ExportChoice {
  readonly deckIds: readonly string[];
  readonly notes: boolean;
  readonly achievements: boolean;
}

/** Fertige Datei samt Kennzahlen; wird vor dem Tippen erzeugt, damit das Teilen direkt folgen kann. */
export interface PreparedExport {
  readonly file: File;
  readonly pack: JuriPackage;
  readonly stats: PackStats;
  readonly deckIds: readonly string[];
  readonly skipped: number;
  readonly linksDropped: number;
}

export async function prepareExport(
  choice: ExportChoice,
  now = Date.now(),
): Promise<PreparedExport> {
  const db = database();
  const [source, profile, achievements, senderId, social] = await Promise.all([
    readExportSource(db, choice.deckIds),
    readProfile(db),
    choice.achievements ? readAchievements(db, now) : Promise.resolve(null),
    ensureSenderId(db, newId),
    readHighFives(db),
  ]);
  const built = buildPackage(source, {
    deckIds: choice.deckIds,
    notes: choice.notes,
    achievements,
    senderName: profile?.name,
    senderId,
    // Mitreise (A9): gegebene High fives reisen nur mit dem Schalter „Erfolge mitschicken“.
    highFives: achievements ? outgoingHighFives(social.kudos, now) : [],
    now,
    appVersion: BUILD.version,
  });
  const bytes = encodeJuri(built.pack);
  const names = built.pack.decks.map((d) => d.name);
  return {
    file: new File([bytes], juriFileName(names, now), { type: JURI_MIME, lastModified: now }),
    pack: built.pack,
    stats: packStats(built.pack),
    deckIds: built.pack.decks.map((d) => d.id),
    skipped: built.skipped,
    linksDropped: built.linksDropped,
  };
}

export type SendOutcome = DeliverOutcome;

/**
 * Teilt die Datei (Teilen-Menü nur nach `canShare`-Test, sonst Download, siehe `deliverFile`) und
 * vermerkt danach das Teilen (Meilenstein „Teamplayer“, gemeinsamer Stand der Karten).
 */
export async function sendExport(prepared: PreparedExport): Promise<SendOutcome> {
  const outcome = await deliverFile(prepared.file);
  if (outcome === 'abgebrochen') return outcome;
  await recordShared(
    database(),
    {
      decks: prepared.deckIds,
      hashes: new Map(prepared.pack.cards.map((c) => [c.id, contentHash(c)])),
    },
    Date.now(),
  );
  return outcome;
}

/** Liest und prüft eine gewählte Datei vollständig; wirft `JuriError`. */
export async function readIncoming(file: File): Promise<JuriPackage> {
  // Eine viel zu große Datei gar nicht erst in den Speicher lesen.
  if (file.size > JURI_LIMITS.maxBytes) throw new JuriError('zu-gross');
  return decodeJuri(new Uint8Array(await file.arrayBuffer()));
}

/** Plan für die Vorschau; rechnet auf dem heutigen Stand der Datenbank. */
export async function planIncoming(
  pack: JuriPackage,
  mode: MergeMode,
  decisions?: ReadonlyMap<string, Resolution>,
  now = Date.now(),
): Promise<MergePlan> {
  const local = await readMergeLocal(database(), pack);
  return planMerge({
    pack,
    local,
    mode,
    now,
    newId,
    ...(decisions ? { decisions } : {}),
  });
}

/** Was Kontakt und High fives einer Datei bringen würden, gerechnet auf dem heutigen Stand. */
export function planSocialOf(pack: JuriPackage, now = Date.now()): Promise<ReceivePlan> {
  return planSocial(database(), socialFromManifest(pack.manifest), now);
}

/**
 * Rechnet den Plan noch einmal frisch und führt ihn in einer Transaktion aus, samt Kontakt und
 * High fives aus der Datei (M11): Scheitert etwas, bleibt alles unverändert.
 */
export async function commitIncoming(
  pack: JuriPackage,
  mode: MergeMode,
  decisions?: ReadonlyMap<string, Resolution>,
  now = Date.now(),
): Promise<{ plan: MergePlan; social: ReceivePlan | null }> {
  const plan = await planIncoming(pack, mode, decisions, now);
  const social = await applyMerge(database(), plan, now, socialFromManifest(pack.manifest));
  return { plan, social };
}

export function incomingErrorMessage(error: unknown): string {
  if (error instanceof JuriError) return error.message;
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const { name } = error as { name?: unknown };
    if (name === 'QuotaExceededError') {
      return 'Auf diesem Gerät ist nicht genug Speicher frei. Deine Daten sind unverändert.';
    }
  }
  return 'Das hat nicht geklappt. Deine Daten sind unverändert.';
}

export async function readShareAchievements(): Promise<boolean> {
  const meta = await readMeta(database());
  return meta.shareAchievements ?? true;
}

export async function writeShareAchievements(value: boolean): Promise<void> {
  await writeMeta(database(), 'shareAchievements', value);
}
