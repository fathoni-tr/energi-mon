"use client";

import { useEffect, useState } from "react";
import { ref, get } from "firebase/database";
import { getDatabase } from "firebase/database";
import { getFirebaseApp } from "@/lib/firebase/client";
import { HistoryPointSchema } from "@/lib/firebase/validators/telemetry";
import type { HistoryPoint } from "@/lib/types";

const MAX_POINTS = 288; // 24 jam × 12 titik/jam (5 menit per titik)

/** Downsample array ke maks maxPoints titik (ambil setiap nth titik secara merata). */
function downsample(points: HistoryPoint[], maxPoints: number): HistoryPoint[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  return Array.from(
    { length: maxPoints },
    (_, i) => points[Math.floor(i * step)],
  );
}

/** Tanggal dalam format "YYYY-MM-DD" (WITA = UTC+8, lokasi Sabu Raijua). */
function todayWita(): string {
  const now = new Date(Date.now() + 8 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

export type HistoryState = {
  data: HistoryPoint[];
  loading: boolean;
  error: string | null;
};

export function useHistory(date?: string): HistoryState {
  const [state, setState] = useState<HistoryState>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const targetDate = date ?? todayWita();

    async function fetchHistory() {
      try {
        const app = await getFirebaseApp();
        if (cancelled) return;

        const db = getDatabase(app);
        const histRef = ref(db, `history/${targetDate}`);
        const snapshot = await get(histRef);
        if (cancelled) return;

        if (!snapshot.exists()) {
          setState({ data: [], loading: false, error: null });
          return;
        }

        const raw = snapshot.val() as Record<string, unknown>;
        const points: HistoryPoint[] = [];

        for (const [epochKey, value] of Object.entries(raw)) {
          const parsed = HistoryPointSchema.safeParse({
            epoch: Number(epochKey),
            ...(value as object),
          });
          if (parsed.success) {
            points.push(parsed.data);
          } else {
            console.warn(
              "[useHistory] titik tidak valid:",
              epochKey,
              parsed.error.flatten(),
            );
          }
        }

        points.sort((a, b) => a.epoch - b.epoch);
        setState({
          data: downsample(points, MAX_POINTS),
          loading: false,
          error: null,
        });
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Gagal mengambil data historis";
        setState({ data: [], loading: false, error: msg });
      }
    }

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [date]);

  return state;
}
