import { useMemo, useState } from 'react';
import { minNewPerDay } from '@/domain/scheduler/dailyLimits';
import { goodStreak } from '@/domain/scheduler/fsrs';
import { formatDays } from '@/domain/scheduler/intervals';
import type { LearningSettings } from '@/domain/scheduler/settings';
import { useDeadlineCount } from '@/features/deadlines/queries';
import { saveGoals } from '@/features/progress/actions';
import { useGoals } from '@/features/progress/queries';
import { saveLearningSettings, useLearningSettings } from '@/features/study/settings';
import { StorageError } from '../../components/StorageError';
import { LernrhythmusView } from './LernrhythmusView';

/** „3 T“, „→ 9 T“ … die ersten Abstände bei durchgehend „Gut“, mit der gewählten Behaltensquote. */
function examples(retention: number): string[] {
  return goodStreak({ retention }).map((days, i) => (i > 0 ? '→ ' : '') + formatDays(days));
}

const same = (a: LearningSettings, b: LearningSettings) => JSON.stringify(a) === JSON.stringify(b);

/** Lernrhythmus (`/einstellungen/lernrhythmus`), Einstellungen.dc.html; die Zeile „Fristen“ zeigt die echte Zahl. */
export function Lernrhythmus() {
  const settings = useLearningSettings();
  const deadlines = useDeadlineCount();
  const goals = useGoals();
  const storedGoals = goals.status === 'ready' ? goals.value : null;
  const stored = settings.status === 'ready' ? settings.value : null;
  // Wie bei den Einstellungen: schnelles Tippen am Ziel baut auf dem letzten Stand auf.
  const [pendingLearn, setPendingLearn] = useState<number | null>(null);
  if (pendingLearn !== null && storedGoals?.learn === pendingLearn) setPendingLearn(null);
  const learnGoal = pendingLearn ?? storedGoals?.learn;
  // Was gerade gespeichert wird: Schnelles Tippen (Stepper) baut auf dem letzten Stand auf und
  // wartet nicht auf die Datenbank. Sobald die Datenbank denselben Stand meldet, gilt sie wieder.
  const [pending, setPending] = useState<LearningSettings | null>(null);
  if (pending && stored && same(pending, stored)) setPending(null);
  const value = pending ?? stored;
  const retention = value?.retention;
  const chips = useMemo(() => (retention === undefined ? [] : examples(retention)), [retention]);
  if (settings.status === 'error' || goals.status === 'error') return <StorageError />;
  if (!value || !storedGoals || learnGoal === undefined) return null;
  // Das angezeigte Limit folgt dem Ziel sofort, noch bevor die Datenbank es nachgezogen hat.
  const shown = { ...value, newPerDay: Math.max(value.newPerDay, minNewPerDay(learnGoal)) };
  return (
    <LernrhythmusView
      back={{ to: '/einstellungen', label: 'Einstellungen' }}
      settings={shown}
      examples={chips}
      deadlines={deadlines || undefined}
      onChange={(next) => {
        setPending(next);
        saveLearningSettings(next).catch(() => {
          setPending(null);
        });
      }}
      daily={{
        learnGoal,
        onLearnGoalChange: (learn) => {
          setPendingLearn(learn);
          saveGoals({ ...storedGoals, learn }).catch(() => {
            setPendingLearn(null);
          });
        },
      }}
    />
  );
}
