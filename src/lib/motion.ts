"use client";

import { useEffect, useState } from "react";

/** SSR-safe: di server selalu true (tanpa animasi). */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Aktifkan animasi chart hanya setelah mount di client.
 * SSR & hydration render statis (tanpa risiko mismatch), lalu animasi
 * berjalan sekali — kecuali user memilih reduced motion.
 */
export function useChartAnimation(): boolean {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(!prefersReducedMotion());
  }, []);
  return animate;
}

export const CHART_ANIMATION = {
  duration: 700,
  easing: "ease-out" as const,
};
