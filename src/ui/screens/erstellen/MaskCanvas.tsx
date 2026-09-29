import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import {
  drawMask,
  moveMask,
  ordinals,
  removeMask,
  resizeMask,
  type Handle,
  type Mask,
} from '@/domain/cards/occlusion';
import { CoverSurface, type SurfaceMask } from '../../components/CoverSurface';
import { useZoomPan } from '../../useZoomPan';

/** Schrittweite der Pfeiltasten in Bruchteilen des Bildes. */
const KEY_STEP = 0.01;

type Gesture =
  | { kind: 'draw'; from: { x: number; y: number }; pointer: number }
  | {
      kind: 'move';
      n: number;
      from: { x: number; y: number };
      base: readonly Mask[];
      pointer: number;
    }
  | {
      kind: 'resize';
      n: number;
      handle: Handle;
      from: { x: number; y: number };
      base: readonly Mask[];
      pointer: number;
    };

export interface MaskCanvasProps {
  ratio: number;
  /** Bild oder Ersatz in der Größe der Fläche. */
  image: ReactNode;
  masks: readonly Mask[];
  selected: number | null;
  /** Höchste je vergebene Nummer; verhindert, dass eine gelöschte Nummer wiederkehrt. */
  everUsed: number;
  onChange: (masks: Mask[], everUsed: number) => void;
  onSelect: (n: number | null) => void;
  /** Hinweis über dem Bild, solange es keine Felder gibt. */
  overlay?: ReactNode;
  label?: string;
}

/**
 * Felder auf einem Bild aufziehen, verschieben, in der Größe ändern und löschen. Ziehen auf freier
 * Fläche zeichnet ein Feld, Ziehen an einem Feld verschiebt es, Ziehen an einer Ecke ändert die
 * Größe; zwei Finger zoomen und verschieben das Bild. Tastatur: Tab wählt ein Feld, Pfeile
 * verschieben, Umschalt+Pfeile ändern die Größe, Entf löscht. Die Rechnung steht in occlusion.ts.
 */
export function MaskCanvas({
  ratio,
  image,
  masks,
  selected,
  everUsed,
  onChange,
  onSelect,
  overlay,
  label,
}: MaskCanvasProps) {
  const frame = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const zoom = useZoomPan(frame, {
    pan1: false,
    keys: true,
    onMultiStart: () => {
      gesture.current = null;
      setDraft(null);
    },
  });
  const labels = ordinals(masks);

  const at = (event: { clientX: number; clientY: number }) => {
    const rect = inner.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const surfaceMasks: SurfaceMask[] = masks.map((m) => ({
    ...m,
    label: labels.get(m.n) ?? 0,
    look: m.n === selected ? 'selected' : 'covered',
  }));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    zoom.bind.onPointerDown(event);
    if (!event.isPrimary && event.pointerType === 'touch') return;
    // Nur die linke Maustaste zeichnet.
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const target = event.target as Element;
    const from = at(event);
    const handle = target.closest<HTMLElement>('[data-handle]')?.dataset.handle as
      Handle | undefined;
    const maskEl = target.closest<HTMLElement>('[data-mask]');
    frame.current?.setPointerCapture(event.pointerId);
    if (handle && selected !== null) {
      gesture.current = {
        kind: 'resize',
        n: selected,
        handle,
        from,
        base: masks,
        pointer: event.pointerId,
      };
    } else if (maskEl) {
      const n = Number(maskEl.dataset.mask);
      onSelect(n);
      gesture.current = { kind: 'move', n, from, base: masks, pointer: event.pointerId };
    } else {
      onSelect(null);
      gesture.current = { kind: 'draw', from, pointer: event.pointerId };
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    zoom.bind.onPointerMove(event);
    const g = gesture.current;
    if (g?.pointer !== event.pointerId) return;
    const now = at(event);
    if (g.kind === 'draw') {
      const x = Math.min(g.from.x, now.x);
      const y = Math.min(g.from.y, now.y);
      setDraft({ x, y, w: Math.abs(now.x - g.from.x), h: Math.abs(now.y - g.from.y) });
    } else if (g.kind === 'move') {
      onChange(moveMask(g.base, g.n, now.x - g.from.x, now.y - g.from.y), everUsed);
    } else {
      onChange(resizeMask(g.base, g.n, g.handle, now.x - g.from.x, now.y - g.from.y), everUsed);
    }
  };

  const finish = (event: PointerEvent<HTMLDivElement>, commit: boolean) => {
    zoom.bind.onPointerUp(event);
    const g = gesture.current;
    if (g?.pointer !== event.pointerId) return;
    gesture.current = null;
    setDraft(null);
    if (!commit || g.kind !== 'draw') return;
    const created = drawMask(masks, g.from, at(event), everUsed);
    if (!created) return;
    onChange([...masks, created], Math.max(everUsed, created.n));
    onSelect(created.n);
  };

  const onMaskKeyDown = (n: number, event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
      event.key
    ];
    if (step) {
      event.preventDefault();
      const [dx, dy] = step as [number, number];
      onChange(
        event.shiftKey
          ? resizeMask(masks, n, 'se', dx * KEY_STEP, dy * KEY_STEP)
          : moveMask(masks, n, dx * KEY_STEP, dy * KEY_STEP),
        everUsed,
      );
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      onChange(removeMask(masks, n), everUsed);
      onSelect(null);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(n);
    } else if (event.key === 'Escape') {
      onSelect(null);
    }
  };

  return (
    <CoverSurface
      ratio={ratio}
      masks={surfaceMasks}
      transform={zoom.transform}
      frameRef={frame}
      innerRef={inner}
      frameProps={{
        onPointerDown,
        onPointerMove,
        onPointerUp: (event) => {
          finish(event, true);
        },
        onPointerCancel: (event) => {
          finish(event, false);
        },
        onDoubleClick: zoom.bind.onDoubleClick,
      }}
      editable
      onMaskKeyDown={onMaskKeyDown}
      draft={draft}
      overlay={overlay}
      {...(label === undefined ? {} : { label })}
    >
      {image}
    </CoverSurface>
  );
}
