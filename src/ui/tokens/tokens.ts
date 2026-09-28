/**
 * Design-Tokens von Juri. Einzige Quelle für Farben, Formen, Schatten, Schrift und Bewegung.
 *
 * Werte sind exakt aus design/System.dc.html und den übrigen Screens übernommen, nicht gerundet.
 * Abweichung vom Design (Annahme A2): `placeholder` ist #726E7A statt #8E8A99, weil #8E8A99 auf
 * der Fläche #F6F4FB nur 3,08:1 Kontrast erreicht.
 *
 * Aus diesem Objekt entsteht src/ui/tokens/tokens.css (Vite-Plugin in vite.config.ts,
 * Gleichstand abgesichert durch tokens.test.ts).
 */

export const colors = {
  // Kernpalette (Briefing 3.1)
  ink: '#17141F',
  violet: '#6A3FE0',
  'violet-700': '#4B2AA8',
  'violet-900': '#2E1A73',
  'violet-400': '#9A7BEF',
  'violet-300': '#C9B8F7',
  'violet-200': '#DCD1FB',
  'violet-100': '#EEE8FD',
  surface: '#F6F4FB',
  line: '#EFECF5',
  muted: '#6B6678',
  bg: '#FFFFFF',

  // Ergänzungen aus den Screens (Annahme A3)
  link: '#5B34D1',
  'link-hover': '#4B2AA8',
  placeholder: '#726E7A',
  track: '#E4DDF7',
  'border-soft': '#DCD6EA',
  'dash-empty': '#D6D1E2',
  'dash-chip': '#CFC8E0',
  'dash-cloze': '#A08BEA',
  chevron: '#B3AEC0',
  'line-soft': '#F3F1F8',
  paper: '#FBFAFD',
  scrim: 'rgba(23,20,31,.28)',
} as const;

/** Heatmap-Stufen 0 bis 4 (System.dc.html). */
export const heatmap = ['#F1EEF7', '#EEE8FD', '#C9B8F7', '#9A7BEF', '#6A3FE0'] as const;

/** Bewertungsleiter: Helligkeit statt Ampel. */
export const rating = {
  again: { bg: '#FFFFFF', fg: '#17141F', border: '#DCD6EA', label: 'Nochmal' },
  hard: { bg: '#EEE8FD', fg: '#2E1A73', border: 'transparent', label: 'Schwer' },
  good: { bg: '#C9B8F7', fg: '#17141F', border: 'transparent', label: 'Gut' },
  easy: { bg: '#6A3FE0', fg: '#FFFFFF', border: 'transparent', label: 'Leicht' },
} as const;

export const radii = {
  card: '28px',
  'card-ipad': '32px',
  button: '20px',
  'button-sm': '18px',
  'field-xl': '20px',
  'field-lg': '16px',
  field: '14px',
  tag: '8px',
  chip: '999px',
  sheet: '30px',
} as const;

export const shadows = {
  card: '0 24px 48px -28px rgba(46,26,115,.35)',
  'card-ipad': '0 30px 60px -36px rgba(46,26,115,.4)',
  primary: '0 10px 24px -10px rgba(106,63,224,.55)',
  'primary-ipad': '0 14px 30px -14px rgba(106,63,224,.6)',
  toast: '0 18px 40px -16px rgba(46,26,115,.45)',
  sheet: '0 -20px 40px -24px rgba(46,26,115,.4)',
  segment: '0 2px 8px -3px rgba(46,26,115,.3)',
  popover: '0 20px 44px -18px rgba(46,26,115,.45), 0 0 0 1px #EFECF5',
  record: '0 0 0 2px #FFFFFF, 0 0 0 4px #17141F',
  /** Rekordtag in „Letzte 7 Tage“ (Main.dc.html, iPadHeute.dc.html). */
  'record-day': '0 0 0 3px #FFFFFF, 0 0 0 5px #17141F',
} as const;

export const fonts = {
  display: "'Bricolage Grotesque Variable', 'Figtree Variable', system-ui, sans-serif",
  text: "'Figtree Variable', -apple-system, system-ui, sans-serif",
} as const;

/** Typo-Skala aus System.dc.html: Größe / Zeilenhöhe / Laufweite. */
export const type = {
  display: { size: '46px', lineHeight: '1.0', tracking: '-0.03em', weight: '750' },
  question: { size: '28px', lineHeight: '1.18', tracking: '-0.02em', weight: '700' },
  answer: { size: '20px', lineHeight: '1.45', tracking: '0', weight: '500' },
  ui: { size: '16px', lineHeight: '1.4', tracking: '0', weight: '600' },
  label: { size: '12px', lineHeight: '1.2', tracking: '0.06em', weight: '800' },
} as const;

export const easing = {
  standard: 'cubic-bezier(.2,.8,.2,1)',
  flip: 'cubic-bezier(.2,.85,.25,1.08)',
  ring: 'cubic-bezier(.3,.7,.2,1)',
  sheet: 'cubic-bezier(.2,.9,.2,1)',
  knob: 'cubic-bezier(.3,1.4,.5,1)',
  burst: 'cubic-bezier(.1,.8,.2,1)',
} as const;

export const durations = {
  tap: '180ms',
  flip: '620ms',
  out: '420ms',
  knob: '250ms',
  rise: '600ms',
  sheet: '550ms',
  ring: '1100ms',
  pop: '500ms',
  spark: '900ms',
  toast: '2400ms',
} as const;

/** Mindestgröße für Touch-Ziele (Briefing 2, Annahme A1). */
export const touchTarget = '44px';

export const tokens = {
  colors,
  heatmap,
  rating,
  radii,
  shadows,
  fonts,
  type,
  easing,
  durations,
  touchTarget,
} as const;

export type Tokens = typeof tokens;
