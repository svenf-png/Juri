import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { pdfShortcut } from '@/domain/device/shortcuts';
import {
  clampViewport,
  gestureZoomFactor,
  HOME,
  pan,
  pinch,
  stepZoom,
  wheelPixels,
  wheelZoomFactor,
  zoomAround,
  type Pt,
  type Viewport,
} from '@/domain/media/viewport';
import { useKeys } from './useKeys';

export interface ZoomPan {
  viewport: Viewport;
  /** CSS-Transformation der Fläche; Ursprung oben links. */
  transform: string;
  reset: () => void;
  /** Zeiger-Ereignisse für den Rahmen. */
  bind: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void;
    onDoubleClick: (event: React.MouseEvent<HTMLElement>) => void;
  };
}

/**
 * Zoomen und Verschieben eines Rahmens: Zwei Finger zoomen und verschieben, ein Finger verschiebt
 * nur, wenn `pan1` gilt und schon gezoomt ist; Strg+Rad und Trackpad-Zwicken zoomen, das Rad
 * verschiebt (Firefox meldet Mausrad-Schritte in Zeilen, sie werden in Pixel umgerechnet), die
 * Safari-Geste auf dem Mac zoomt über `gesturechange`, Doppeltippen wechselt zwischen 1 und 2,5.
 * Mit `keys` zoomen auch „+“, „−“ und „0“. `onMultiStart` meldet, wenn ein zweiter
 * Finger dazukommt (der Editor bricht dann ein begonnenes Feld ab). Die Rechnung steht in
 * domain/media/viewport.ts; hier nur die Zeiger.
 */
export function useZoomPan(
  frame: RefObject<HTMLElement | null>,
  options: { pan1?: boolean; keys?: boolean; onMultiStart?: () => void } = {},
): ZoomPan {
  const { pan1 = true, keys = false, onMultiStart } = options;
  const [viewport, setViewport] = useState<Viewport>(HOME);
  const view = useRef(viewport);
  const pointers = useRef(new Map<number, Pt>());

  const update = useCallback((next: Viewport) => {
    view.current = next;
    setViewport(next);
  }, []);

  const size = useCallback(() => {
    const rect = frame.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  }, [frame]);

  const local = useCallback(
    (event: { clientX: number; clientY: number }): Pt => {
      const rect = frame.current?.getBoundingClientRect();
      return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
    },
    [frame],
  );

  useEffect(() => {
    const element = frame.current;
    if (!element) return undefined;
    const onWheel = (event: WheelEvent) => {
      const at = local(event);
      if (event.ctrlKey) {
        event.preventDefault();
        update(
          zoomAround(
            view.current,
            wheelZoomFactor(event.deltaY, event.deltaMode),
            at.x,
            at.y,
            size(),
          ),
        );
      } else if (view.current.zoom > 1) {
        event.preventDefault();
        update(
          pan(
            view.current,
            -wheelPixels(event.deltaX, event.deltaMode),
            -wheelPixels(event.deltaY, event.deltaMode),
            size(),
          ),
        );
      }
    };
    // Safari auf dem Mac zwickt über eigene Gesten-Ereignisse (nicht standardisiert). Während
    // Finger auf dem Bildschirm liegen (iPhone, iPad), zoomt schon `pinch` aus den Zeigern.
    let scale = 1;
    const gesture = (event: Event) => event as Event & { scale: number };
    const onGestureStart = (event: Event) => {
      if (pointers.current.size > 0) return;
      event.preventDefault();
      scale = 1;
    };
    const onGestureChange = (event: Event) => {
      if (pointers.current.size > 0) return;
      event.preventDefault();
      const next = gesture(event).scale;
      const rect = element.getBoundingClientRect();
      update(
        zoomAround(
          view.current,
          gestureZoomFactor(scale, next),
          rect.width / 2,
          rect.height / 2,
          size(),
        ),
      );
      scale = next;
    };
    // Nicht passiv, damit das Zwicken die Seite nicht mitzoomt.
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('gesturestart', onGestureStart);
    element.addEventListener('gesturechange', onGestureChange);
    return () => {
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('gesturestart', onGestureStart);
      element.removeEventListener('gesturechange', onGestureChange);
    };
  }, [frame, local, size, update]);

  useKeys((input) => {
    if (!keys) return false;
    const action = pdfShortcut(input);
    if (action === 'zoom-in' || action === 'zoom-out') {
      update(stepZoom(view.current, action === 'zoom-in' ? 1 : -1, size()));
      return true;
    }
    if (action === 'zoom-reset') {
      update(HOME);
      return true;
    }
    return false;
  });

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    // Ein neuer erster Finger beginnt eine neue Geste; übrig gebliebene Zeiger (verpasstes
    // „losgelassen“) würden sonst als zweiter Finger zählen.
    if (event.isPrimary) pointers.current.clear();
    pointers.current.set(event.pointerId, local(event));
    if (pointers.current.size === 2) onMultiStart?.();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const before = pointers.current.get(event.pointerId);
    if (!before) return;
    const now = local(event);
    if (pointers.current.size >= 2) {
      const others = [...pointers.current.entries()].filter(([id]) => id !== event.pointerId);
      const other = others[0]?.[1];
      pointers.current.set(event.pointerId, now);
      if (other) update(pinch(view.current, before, other, now, other, size()));
      return;
    }
    pointers.current.set(event.pointerId, now);
    if (pan1 && view.current.zoom > 1) {
      update(pan(view.current, now.x - before.x, now.y - before.y, size()));
    }
  };

  const release = (event: ReactPointerEvent<HTMLElement>) => {
    pointers.current.delete(event.pointerId);
  };

  return {
    viewport,
    transform: `translate(${String(viewport.x)}px, ${String(viewport.y)}px) scale(${String(viewport.zoom)})`,
    reset: () => {
      update(HOME);
    },
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: release,
      onPointerCancel: release,
      onDoubleClick: (event) => {
        const at = local(event);
        const zoomed = view.current.zoom > 1;
        update(
          zoomed ? HOME : clampViewport(zoomAround(view.current, 2.5, at.x, at.y, size()), size()),
        );
      },
    },
  };
}
