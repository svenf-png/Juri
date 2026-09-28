import { useState } from 'react';
import { AppIconMark } from '../../components/AppIconMark';
import { Button } from '../../components/Button';
import { CardFlip } from '../../components/CardFlip';
import { Celebration } from '../../components/Celebration';
import { RatingBar, type RatingKey } from '../../components/RatingBar';
import { BackLink, Screen, ScreenTitle } from '../../components/Screen';
import { Wordmark } from '../../components/Wordmark';
import { cx } from '../../cx';
import { colors, durations, easing, heatmap, rating, type as typeScale } from '../../tokens/tokens';
import styles from './Styleguide.module.css';

const SCALE = [
  ['surface', 'F6F4FB Fläche'],
  ['violet-100', 'EEE8FD 100'],
  ['violet-300', 'C9B8F7 300'],
  ['violet-400', '9A7BEF 400'],
  ['violet-700', '4B2AA8 700'],
] as const;

const TYPE_ROWS: [string, keyof typeof typeScale][] = [
  ['Display', 'display'],
  ['Kartenfrage', 'question'],
  ['Antwort', 'answer'],
  ['UI', 'ui'],
  ['Label', 'label'],
];

const MOTION_ROWS: [string, string][] = [
  ['Karte umdrehen', `${durations.flip} · ${easing.flip}`],
  ['Karte wegfliegen', `${durations.out} · rechts / nach hinten`],
  ['Antippen', `${durations.tap} · Skalierung 0,96 bis 0,97`],
  ['Erfolg', `Ring ${durations.ring} → Haken → Funken`],
  ['Kurve', easing.standard],
  ['Reduzierte Bewegung', 'alles aus'],
];

const INTERVALS: Record<RatingKey, string> = {
  again: '10 min',
  hard: '2 T',
  good: '5 T',
  easy: '12 T',
};

function percentTracking(value: string): string {
  const em = Number.parseFloat(value);
  return em === 0 ? '' : ` / ${em < 0 ? '−' : '+'}${Math.round(Math.abs(em) * 100)} %`;
}

export function Styleguide() {
  const [flipped, setFlipped] = useState(false);
  const [celebration, setCelebration] = useState(0);
  const [lastRating, setLastRating] = useState<RatingKey | null>(null);

  return (
    <Screen width="wide">
      <BackLink to="/" label="Start" />
      <ScreenTitle lead="Tokens aus design/System.dc.html, live aus src/ui/tokens/tokens.ts.">
        Styleguide
      </ScreenTitle>

      <div className={styles.grid}>
        <section className={styles.section} aria-labelledby="sg-farbe">
          <h2 id="sg-farbe" className={styles.h2}>
            Farbe · Tinte + Veilchen
          </h2>
          <div className={styles.bigTiles}>
            <div
              className={styles.bigTile}
              style={{ background: colors.violet }}
              data-testid="tile-violet"
            >
              <strong>Veilchen</strong>
              <span>{colors.violet} · Aktion</span>
            </div>
            <div className={styles.bigTile} style={{ background: colors.ink }}>
              <strong>Tinte</strong>
              <span>{colors.ink} · Text, Auswahl</span>
            </div>
          </div>
          <div className={styles.scale}>
            {SCALE.map(([key, label]) => (
              <div key={key}>
                <div className={styles.scaleTile} style={{ background: colors[key] }} />
                <div className={styles.scaleLabel}>{label}</div>
              </div>
            ))}
          </div>
          <div className={styles.list}>
            {Object.entries(colors).map(([name, value]) => (
              <div key={name} className={styles.row}>
                <span className={styles.swatch} style={{ background: value }} />
                <span className={styles.rowName}>--{name}</span>
                <span className={styles.rowValue}>{value}</span>
              </div>
            ))}
          </div>
          <div>
            <p className={styles.h2} style={{ paddingBottom: 8 }}>
              Heatmap-Stufen
            </p>
            <div className={styles.heat}>
              {heatmap.map((c) => (
                <span key={c} className={styles.heatCell} style={{ background: c }} />
              ))}
              <span
                className={cx(styles.heatCell, styles.record)}
                style={{ background: colors.violet }}
              />
              <span className={styles.heatLabel}>Rekord</span>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="sg-schrift">
          <h2 id="sg-schrift" className={styles.h2}>
            Schrift
          </h2>
          <div className={styles.displaySample}>
            Aa
            <br />
            <em>18 Karten</em>
          </div>
          <span className={styles.caption}>
            Bricolage Grotesque · Headlines, Zahlen, Kartenfragen · 500 bis 800
          </span>
          <p className={styles.bodySample}>
            Die von einem natürlichen Herrschaftswillen getragene tatsächliche Sachherrschaft.
          </p>
          <span className={styles.caption}>Figtree · Antworten, UI, Fließtext · 400 bis 700</span>
          <div className={styles.list}>
            {TYPE_ROWS.map(([label, key]) => {
              const t = typeScale[key];
              return (
                <div key={key} className={styles.row}>
                  <span className={styles.rowName}>{label}</span>
                  <span className={styles.rowValue}>
                    {Number.parseFloat(t.size)} / {t.lineHeight}
                    {percentTracking(t.tracking)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className={styles.icons}>
            <AppIconMark size={96} />
            <AppIconMark size={96} variant="test" />
            <Wordmark size={56} />
          </div>
          <span className={styles.caption}>App-Icon, Test-Icon und Wortmarke</span>
        </section>

        <section className={styles.section} aria-labelledby="sg-bewertung">
          <h2 id="sg-bewertung" className={styles.h2}>
            Bewertung · Helligkeit statt Ampel
          </h2>
          <RatingBar intervals={INTERVALS} onRate={setLastRating} />
          <span className={styles.caption} aria-live="polite">
            {lastRating ? `Zuletzt: ${rating[lastRating].label}` : 'Antippen zum Ausprobieren'}
          </span>

          <h2 className={styles.h2}>Form</h2>
          <div className={styles.shapes}>
            <div
              className={styles.shape}
              style={{
                width: 84,
                height: 100,
                borderRadius: 28,
                alignItems: 'flex-end',
                paddingBottom: 8,
              }}
            >
              Karte 28
            </div>
            <div className={styles.shape} style={{ width: 84, height: 60, borderRadius: 20 }}>
              Button 20
            </div>
            <div className={styles.shape} style={{ width: 84, height: 46, borderRadius: 14 }}>
              Feld 14
            </div>
            <div className={styles.shape} style={{ width: 60, height: 30, borderRadius: 15 }}>
              Chip
            </div>
          </div>

          <h2 className={styles.h2}>Bewegung</h2>
          <div className={styles.list}>
            {MOTION_ROWS.map(([label, value]) => (
              <div key={label} className={styles.row}>
                <span className={styles.rowName}>{label}</span>
                <span className={styles.rowValue}>{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="sg-karte">
          <h2 id="sg-karte" className={styles.h2}>
            Karte umdrehen
          </h2>
          <div className={styles.demo}>
            <CardFlip
              flipped={flipped}
              onFlip={() => setFlipped(true)}
              height={400}
              front={
                <>
                  <span className={styles.tags}>
                    <span className={styles.tagArea}>SR</span>
                    <span className={styles.tagType}>Frage</span>
                    <span className={styles.norm}>§ 242 StGB</span>
                  </span>
                  <span className={styles.question}>Was versteht man unter Gewahrsam?</span>
                  <span className={styles.hint}>Tippen zum Umdrehen</span>
                </>
              }
              back={
                <div className={cx(styles.buttons, styles.back)}>
                  <span className={styles.answerLabel}>Antwort</span>
                  <span className={styles.answerQuestion}>Was versteht man unter Gewahrsam?</span>
                  <span className={styles.answer}>
                    Die von einem natürlichen Herrschaftswillen getragene tatsächliche
                    Sachherrschaft.
                  </span>
                </div>
              }
            />
            <Button
              variant="soft"
              size="md"
              block
              onClick={() => setFlipped(false)}
              disabled={!flipped}
            >
              Zurückdrehen
            </Button>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="sg-erfolg">
          <h2 id="sg-erfolg" className={styles.h2}>
            Erfolg
          </h2>
          <div className={styles.demo}>
            <Celebration key={celebration} />
            <Button variant="ink" size="md" block onClick={() => setCelebration((n) => n + 1)}>
              Nochmal abspielen
            </Button>
            <p className={styles.note}>Ring 1,1 s, dann Haken-Pop, dann 10 Funken.</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="sg-knoepfe">
          <h2 id="sg-knoepfe" className={styles.h2}>
            Knöpfe
          </h2>
          <div className={styles.buttons}>
            <Button variant="primary" block>
              Lernen starten
            </Button>
            <Button variant="ink" block>
              Antwort zeigen
            </Button>
            <Button variant="soft" size="md" block>
              Nochmal durchspielen
            </Button>
            <Button variant="outline" size="md" block>
              Alle zeigen
            </Button>
            <Button variant="ghost" size="sm" block>
              Schließen
            </Button>
          </div>
        </section>
      </div>
    </Screen>
  );
}
