import { useCallback, useEffect, useRef } from 'react';

const GAZE_REACH = 160;
const GAZE_RANGE = 0.75;
const GAZE_EASE = 0.2;
const REST = { x: 0, y: 0 };

const lerp = (a, b, t) => a + (b - a) * t;

export function usePointerGaze() {
  const pointerRef = useRef(null);
  const gazeRef = useRef(REST);

  useEffect(() => {
    const track = (e) => { pointerRef.current = { x: e.clientX, y: e.clientY }; };
    const forgetWhenLeavingWindow = (e) => { if (!e.relatedTarget) pointerRef.current = null; };
    window.addEventListener('pointermove', track);
    document.addEventListener('pointerout', forgetWhenLeavingWindow);
    return () => {
      window.removeEventListener('pointermove', track);
      document.removeEventListener('pointerout', forgetWhenLeavingWindow);
    };
  }, []);

  return useCallback((svg, center, room) => {
    const target = aimAt(svg, pointerRef.current, center, room * GAZE_RANGE);
    gazeRef.current = {
      x: lerp(gazeRef.current.x, target.x, GAZE_EASE),
      y: lerp(gazeRef.current.y, target.y, GAZE_EASE),
    };
    return gazeRef.current;
  }, []);
}

function aimAt(svg, pointer, center, maxShift) {
  if (!pointer) return REST;
  const screenMatrix = svg.getScreenCTM();
  if (!screenMatrix) return REST;
  const target = new DOMPoint(pointer.x, pointer.y).matrixTransform(screenMatrix.inverse());
  const dx = target.x - center.x, dy = target.y - center.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return REST;
  const shift = maxShift * Math.min(1, distance / GAZE_REACH);
  return { x: (dx / distance) * shift, y: (dy / distance) * shift };
}
