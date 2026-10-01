import type { ComponentType } from 'react';
import {
  CalendarIcon,
  HomeIcon,
  SettingsIcon,
  ShareIcon,
  SlidersIcon,
  StackIcon,
  TrophyIcon,
} from './icons';

/** Ziele der Hauptnavigation (Tab-Bar in Main.dc.html, Sidebar in iPadHeute.dc.html). */
export type NavKey =
  'heute' | 'stapel' | 'erfolge' | 'fristen' | 'teilen' | 'rhythmus' | 'einstellungen';

export interface NavItem {
  key: NavKey;
  to: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}

export const NAV: Record<NavKey, NavItem> = {
  heute: { key: 'heute', to: '/', label: 'Heute', Icon: HomeIcon },
  stapel: { key: 'stapel', to: '/stapel', label: 'Stapel', Icon: StackIcon },
  erfolge: { key: 'erfolge', to: '/erfolge', label: 'Erfolge', Icon: TrophyIcon },
  fristen: { key: 'fristen', to: '/fristen', label: 'Fristen', Icon: CalendarIcon },
  teilen: { key: 'teilen', to: '/teilen', label: 'Teilen', Icon: ShareIcon },
  // Im Design führt „Lernrhythmus“ zu Einstellungen.dc.html (M4).
  rhythmus: {
    key: 'rhythmus',
    to: '/einstellungen/lernrhythmus',
    label: 'Lernrhythmus',
    Icon: SlidersIcon,
  },
  // Ergänzung zum Design (Sidebar: `data-addition`): Profil, Speicher und Backup. Nach `rhythmus`,
  // damit `navKeyFor` für /einstellungen/lernrhythmus weiter „Lernrhythmus“ findet.
  einstellungen: {
    key: 'einstellungen',
    to: '/einstellungen',
    label: 'Einstellungen',
    Icon: SettingsIcon,
  },
};

/** Tab-Bar (iPhone): links zwei, in der Mitte „Neue Karte“, rechts zwei. */
export const TAB_BAR: readonly [NavKey, NavKey, NavKey, NavKey] = [
  'heute',
  'stapel',
  'erfolge',
  'teilen',
];

/** Sidebar (iPad), Reihenfolge wie in iPadHeute.dc.html. */
export const SIDEBAR: readonly NavKey[] = [
  'heute',
  'stapel',
  'erfolge',
  'fristen',
  'teilen',
  'rhythmus',
  'einstellungen',
];

export const NEW_CARD_PATH = '/neu';

/** Aktiver Navigationspunkt zu einem Pfad (ohne Basis-Pfad), sonst `null`. */
export function navKeyFor(pathname: string): NavKey | null {
  const match = Object.values(NAV).find(
    (item) => pathname === item.to || (item.to !== '/' && pathname.startsWith(`${item.to}/`)),
  );
  return match ? match.key : null;
}
