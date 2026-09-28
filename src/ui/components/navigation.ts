import type { ComponentType } from 'react';
import { CalendarIcon, HomeIcon, ShareIcon, SlidersIcon, StackIcon, TrophyIcon } from './icons';

/** Ziele der Hauptnavigation (Tab-Bar in Main.dc.html, Sidebar in iPadHeute.dc.html). */
export type NavKey = 'heute' | 'stapel' | 'erfolge' | 'fristen' | 'teilen' | 'rhythmus';

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
  // Im Design führt „Lernrhythmus“ zu Einstellungen.dc.html; der Rhythmus selbst kommt mit M4.
  rhythmus: { key: 'rhythmus', to: '/einstellungen', label: 'Lernrhythmus', Icon: SlidersIcon },
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
];

export const NEW_CARD_PATH = '/neu';

/** Aktiver Navigationspunkt zu einem Pfad (ohne Basis-Pfad), sonst `null`. */
export function navKeyFor(pathname: string): NavKey | null {
  const first = `/${pathname.split('/')[1] ?? ''}`;
  const match = Object.values(NAV).find((item) => item.to === first);
  return match ? match.key : null;
}
