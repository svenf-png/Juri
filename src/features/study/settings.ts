import { useCallback } from 'react';
import { readSettings, writeSettings } from '@/data/repositories/study';
import type { LearningSettings } from '@/domain/scheduler/settings';
import { database } from '../app/database';
import { useLive, type Live } from '../library/useLive';

/** Einstellungen des Lernrhythmus, live aus der Datenbank. */
export function useLearningSettings(): Live<LearningSettings> {
  const query = useCallback((db: Parameters<typeof readSettings>[0]) => readSettings(db), []);
  return useLive('learning-settings', query);
}

/** Speichert die Einstellungen; beim Wechsel des Algorithmus schreibt es den Index aller Abfragen neu. */
export function saveLearningSettings(next: LearningSettings): Promise<void> {
  return writeSettings(database(), next);
}
