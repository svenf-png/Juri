import type { CSSProperties } from 'react';
import styles from './Celebration.module.css';

const BASE = 170;

const DESIGN_SIZES: Partial<Record<number, { pop: number; check: number }>> = {
  170: { pop: 80, check: 40 },
  150: { pop: 70, check: 36 },
};

interface Spark {
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
}

/** Zehn Funken wie in Lernen.dc.html: Radius 118/136, Größe 10/7, abwechselnd violet/violet-300. */
const SPARKS: readonly Spark[] = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  const radius = 118 + (i % 2) * 18;
  return {
    dx: Math.round(Math.cos(angle) * radius),
    dy: Math.round(Math.sin(angle) * radius),
    size: i % 3 === 0 ? 10 : 7,
    color: i % 2 ? 'var(--violet-300)' : 'var(--violet)',
    delay: 1.1 + i * 0.02,
  };
});

/**
 * Erfolgs-Animation. Neu abspielen, indem der Aufrufer den `key` ändert.
 * Maße skalieren mit `size` (Referenz 170 px, Fertig.dc.html nutzt 150 px).
 */
export function Celebration({
  size = BASE,
  label = 'Geschafft',
}: {
  size?: number;
  label?: string;
}) {
  const k = size / BASE;
  // Exakte Designmaße für 170 px (Lernen) und 150 px (Fertig), sonst proportional.
  const fixed = DESIGN_SIZES[size];
  const popSize = fixed?.pop ?? Math.round(80 * k);
  const checkSize = fixed?.check ?? Math.round(40 * k);
  const popOffset = (size - popSize) / 2;
  return (
    <div
      className={styles.wrap}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox="0 0 170 170" aria-hidden="true">
        <circle cx="85" cy="85" r="74" fill="none" stroke="var(--violet-100)" strokeWidth="12" />
        <circle
          className={styles.ring}
          cx="85"
          cy="85"
          r="74"
          fill="none"
          stroke="var(--violet)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="465"
          transform="rotate(-90 85 85)"
        />
      </svg>
      <div
        className={styles.pop}
        style={{ left: popOffset, top: popOffset, width: popSize, height: popSize }}
        aria-hidden="true"
      >
        <svg
          width={checkSize}
          height={checkSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5l4.5 4.5L19 7" />
        </svg>
      </div>
      {SPARKS.map((s, i) => {
        const style = {
          left: size / 2 - s.size / 2,
          top: size / 2 - s.size / 2,
          width: s.size,
          height: s.size,
          background: s.color,
          animationDelay: `${s.delay.toFixed(2)}s`,
          '--dx': `${Math.round(s.dx * k)}px`,
          '--dy': `${Math.round(s.dy * k)}px`,
        } as CSSProperties;
        return <span key={i} className={styles.spark} style={style} aria-hidden="true" />;
      })}
    </div>
  );
}
