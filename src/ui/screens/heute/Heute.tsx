import type { ProfileData } from '@/features/app/appData';
import { useToday } from '@/features/today/useToday';
import { HeuteView } from './HeuteView';

/** Startseite der App: Heute mit den Daten dieses Geräts. */
export function Heute({ data }: { data: ProfileData }) {
  const model = useToday();
  return model ? <HeuteView model={model} name={data.profile.name} /> : null;
}
