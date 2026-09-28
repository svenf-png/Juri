import { useMemo } from 'react';
import { formatDays } from '@/domain/scheduler/intervals';
import { goodStreak } from '@/domain/scheduler/fsrs';
import { saveLearningSettings, useLearningSettings } from '@/features/study/settings';
import { StorageError } from '../../components/StorageError';
import { LernrhythmusView } from './LernrhythmusView';

/** „3 T“, „→ 9 T“ … die ersten Abstände bei durchgehend „Gut“, mit der gewählten Behaltensquote. */
function examples(retention: number): string[] {
  return goodStreak({ retention }).map((days, i) => (i > 0 ? '→ ' : '') + formatDays(days));
}

/** Lernrhythmus (`/einstellungen/lernrhythmus`), Einstellungen.dc.html. */
export function Lernrhythmus() {
  const settings = useLearningSettings();
  const value = settings.status === 'ready' ? settings.value : null;
  const chips = useMemo(() => (value ? examples(value.retention) : []), [value]);
  if (settings.status === 'error') return <StorageError />;
  if (!value) return null;
  return (
    <LernrhythmusView
      back={{ to: '/einstellungen', label: 'Einstellungen' }}
      settings={value}
      examples={chips}
      onChange={(next) => {
        void saveLearningSettings(next);
      }}
    />
  );
}
