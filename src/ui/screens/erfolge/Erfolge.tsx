import { useEffect, useState } from 'react';
import { acknowledgeMilestones, catchUpMilestones } from '@/features/progress/actions';
import { useErfolge } from '@/features/progress/queries';
import { useLearningSettings } from '@/features/study/settings';
import { StorageError } from '../../components/StorageError';
import { ErfolgeView } from './ErfolgeView';
import { MeilensteinSheet } from './MeilensteinSheet';
import { ZieleSheet } from './ZieleSheet';

/** Erfolge (`/erfolge`): Serie, Heatmap, Meilensteine; Tagesziele im Sheet, Feier für neue Meilensteine. */
export function Erfolge() {
  const { model, goals, failed } = useErfolge();
  const learning = useLearningSettings();
  const [goalsOpen, setGoalsOpen] = useState(false);
  // Meilensteine, die Erfolge schon gefeiert hat, bis die Datenbank „gesehen“ meldet.
  const [celebrated, setCelebrated] = useState<readonly string[]>([]);

  useEffect(() => {
    document.title = 'Erfolge · Juri';
    catchUpMilestones().catch(() => undefined);
  }, []);

  if (failed) return <StorageError />;
  if (!model || !goals) return null;
  const fresh = model.fresh.filter((b) => !celebrated.includes(b.id));
  const current = fresh[0] ?? null;

  return (
    <>
      <ErfolgeView
        model={model}
        onGoals={() => {
          setGoalsOpen(true);
        }}
      />
      <ZieleSheet
        open={goalsOpen}
        goals={goals}
        newPerDay={learning.status === 'ready' ? learning.value.newPerDay : undefined}
        onClose={() => {
          setGoalsOpen(false);
        }}
      />
      <MeilensteinSheet
        badge={current}
        more={Math.max(0, fresh.length - 1)}
        onClose={() => {
          if (!current) return;
          setCelebrated((list) => [...list, current.id]);
          acknowledgeMilestones([current.id]).catch(() => undefined);
        }}
      />
    </>
  );
}
