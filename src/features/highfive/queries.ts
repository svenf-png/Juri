import { useCallback, useMemo } from 'react';
import { readHighFives } from '@/data/repositories/highfive';
import { highFivesModel, type HighFivesModel } from '@/domain/highfive/view';
import { useLive } from '../library/useLive';
import { useLearningDayKey } from '../today/useToday';

/**
 * Kontakte und High fives als Ansichtsmodell, live aus der Datenbank. Der Lerntag steht im Schlüssel,
 * damit „heute gegeben“ und „gestern“ nach 04:00 neu gerechnet werden. `failed`, wenn die Datenbank
 * nicht antwortet.
 */
export function useHighFives(): { model: HighFivesModel | null; failed: boolean } {
  const day = useLearningDayKey();
  const query = useCallback((db: Parameters<typeof readHighFives>[0]) => readHighFives(db), []);
  const data = useLive(`highfive:${day}`, query);
  const model = useMemo(
    () =>
      data.status === 'ready'
        ? highFivesModel(data.value.contacts, data.value.kudos, Date.now())
        : null,
    [data, day],
  );
  return { model, failed: data.status === 'error' };
}
