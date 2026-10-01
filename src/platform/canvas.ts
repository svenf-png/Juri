import {
  HAND_PATH,
  cardFont,
  cardPlan,
  type CardContent,
  type CardOp,
} from '@/domain/highfive/card';

/**
 * Zeichnet die Bildkarte (M11) mit dem Canvas-Standard, ohne Fremdcode: Der Plan aus
 * `domain/highfive/card.ts` sagt, was gezeichnet wird. Gibt ein PNG zurück.
 */
export async function renderCardPng(content: CardContent): Promise<{ blob: Blob; alt: string }> {
  // Schriften der App laden, bevor gemessen und gezeichnet wird (sonst zeichnet Canvas die Ersatzschrift).
  await Promise.all([
    document.fonts.load(cardFont(136, 750, 'display')),
    document.fonts.load(cardFont(52, 600, 'body')),
  ]);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas nicht verfügbar');
  const plan = cardPlan(content, (text, font) => {
    ctx.font = font;
    return ctx.measureText(text).width;
  });
  canvas.width = plan.width;
  canvas.height = plan.height;
  for (const op of plan.ops) draw(ctx, op, plan.width, plan.height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('PNG konnte nicht erzeugt werden'));
    }, 'image/png');
  });
  return { blob, alt: plan.alt };
}

function draw(ctx: CanvasRenderingContext2D, op: CardOp, width: number, height: number): void {
  if (op.kind === 'fill') {
    ctx.fillStyle = op.color;
    ctx.fillRect(0, 0, width, height);
  } else if (op.kind === 'circle') {
    ctx.beginPath();
    ctx.arc(op.cx, op.cy, op.r, 0, Math.PI * 2);
    if (op.fill) {
      ctx.fillStyle = op.fill;
      ctx.fill();
    }
    if (op.stroke) {
      ctx.lineWidth = op.lineWidth ?? 1;
      ctx.strokeStyle = op.stroke;
      ctx.stroke();
    }
  } else if (op.kind === 'hand') {
    ctx.save();
    ctx.translate(op.x, op.y);
    ctx.scale(op.scale, op.scale);
    ctx.lineWidth = op.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = op.color;
    ctx.stroke(new Path2D(HAND_PATH));
    ctx.restore();
  } else {
    ctx.font = cardFont(op.size, op.weight, op.family);
    ctx.fillStyle = op.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(op.text, op.x, op.y);
  }
}
