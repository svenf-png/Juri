import type { MilestoneIcon } from '@/domain/progress/milestones';

/** Pfade der Abzeichen-Icons (Erfolge.dc.html). */
const BADGE_ICONS: Readonly<Record<MilestoneIcon, string>> = {
  pen: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
  stack: 'M4 8h16v12H4zM7 4.5h10',
  tree: 'M5 4h6M8 4v16M8 10h6M8 16h6M14 8h5v4h-5zM14 14h5v4h-5z',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
  rep: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4',
  share: 'M12 15V4M8 8l4-4 4 4M5 12v7h14v-7',
};

/** Icon eines Meilensteins im 24er-Raster. */
export function BadgeIcon({ icon, size }: { icon: MilestoneIcon; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={BADGE_ICONS[icon]} />
    </svg>
  );
}
