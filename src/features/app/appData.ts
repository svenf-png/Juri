import { useSyncExternalStore } from 'react';
import { observe } from '@/data/live';
import { readMeta, readProfile } from '@/data/repositories/profile';
import type { MetaValues, Profile } from '@/domain/model/records';
import { database } from './database';

export interface AppData {
  profile: Profile | null;
  meta: Partial<MetaValues>;
}

/** Daten hinter dem Routen-Wächter RequireProfile: Profil ist vorhanden. */
export type ProfileData = AppData & { profile: Profile };

export type AppDataState =
  { status: 'loading' } | { status: 'ready'; value: AppData } | { status: 'error'; error: unknown };

let state: AppDataState = { status: 'loading' };
let started = false;
const listeners = new Set<() => void>();

function start() {
  if (started) return;
  started = true;
  const db = database();
  // Läuft für die ganze Sitzung: Onboarding, Backup und Zurücksetzen wirken sofort überall.
  observe(
    async () => ({ profile: await readProfile(db), meta: await readMeta(db) }),
    (value) => {
      emit({ status: 'ready', value });
    },
    (error: unknown) => {
      emit({ status: 'error', error });
    },
  );
}

function emit(next: AppDataState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  start();
  return () => {
    listeners.delete(listener);
  };
}

/** Profil und Metadaten, live aus der Datenbank. */
export function useAppData(): AppDataState {
  return useSyncExternalStore(subscribe, () => state);
}
