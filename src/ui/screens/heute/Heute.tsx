import type { ProfileData } from '@/features/app/appData';
import { useToday } from '@/features/today/useToday';
import { StorageError } from '../../components/StorageError';
import { HeuteView } from './HeuteView';

/** Startseite der App: Heute mit den Daten dieses Geräts. */
export function Heute({ data }: { data: ProfileData }) {
  const { model, failed } = useToday();
  if (failed) return <StorageError />;
  return model ? <HeuteView model={model} name={data.profile.name} /> : null;
}
