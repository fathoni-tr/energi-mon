"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animasi angka naik (count-up) via requestAnimationFrame.
 * - Initial render = nilai akhir (markup SSR benar, tanpa mismatch).
 * - Saat mount: animasi 0 -> value; saat value berubah: animasi lama -> baru.
 * - prefers-reduced-motion: langsung snap tanpa animasi.
 */
export function useCountUp(
  value: number | null,
  duration = 600,
): number | null {
  const [display, setDisplay] = useState<number | null>(value);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === null) {
      setDisplay(null);
      return;
    }
    if (prefersReducedMotion()) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const from = fromRef.current;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const current = from + ((value as number) - from) * easeOutCubic(t);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value as number;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = value;
    };
  }, [value, duration]);

  return display;
}
