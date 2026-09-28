import type { ProfileData } from '@/features/app/appData';
import { useToday } from '@/features/today/useToday';
import { HeuteView } from './HeuteView';

/** Startseite der App: Heute mit den Daten dieses Geräts. */
export function Heute({ data }: { data: ProfileData }) {
  return <HeuteView model={useToday()} name={data.profile.name} />;
}
