"use client";

import { useEffect, useRef, useState } from "react";
import { ref, onValue, off, type DatabaseReference } from "firebase/database";
import { getDatabase } from "firebase/database";
import { getFirebaseApp } from "@/lib/firebase/client";
import {
  LivePayloadSchema,
  type LivePayload,
} from "@/lib/firebase/validators/telemetry";
import type { LiveData } from "@/lib/types";

export type LiveDataState = {
  data: LiveData | null;
  loading: boolean;
  offline: boolean;
  error: string | null;
};

const OFFLINE_THRESHOLD_SECONDS = 30;

/** Konversi LivePayload (RTDB) → LiveData (tipe internal) — identik, tapi validasi sudah lewat Zod */
function toLocalType(payload: LivePayload): LiveData {
  return payload as LiveData;
}

export function useLiveData(): LiveDataState {
  const [state, setState] = useState<LiveDataState>({
    data: null,
    loading: true,
    offline: false,
    error: null,
  });

  const refHandle = useRef<DatabaseReference | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      try {
        const app = await getFirebaseApp();
        if (cancelled) return;

        const db = getDatabase(app);
        const liveRef = ref(db, "live");
        refHandle.current = liveRef;

        onValue(
          liveRef,
          (snapshot) => {
            if (cancelled) return;
            const raw = snapshot.val();
            if (!raw) {
              setState({
                data: null,
                loading: false,
                offline: true,
                error: null,
              });
              return;
            }

            const parsed = LivePayloadSchema.safeParse(raw);
            if (!parsed.success) {
              console.warn(
                "[useLiveData] payload tidak valid:",
                parsed.error.flatten(),
              );
              setState((s) => ({
                ...s,
                loading: false,
                error: "Data tidak valid",
              }));
              return;
            }

            const now = Math.floor(Date.now() / 1000);
            const offline = now - parsed.data.ts > OFFLINE_THRESHOLD_SECONDS;

            setState({
              data: toLocalType(parsed.data),
              loading: false,
              offline,
              error: null,
            });
          },
          (err) => {
            if (cancelled) return;
            console.error("[useLiveData] Firebase error:", err);
            setState({
              data: null,
              loading: false,
              offline: true,
              error: err.message,
            });
          },
        );
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : "Gagal menghubungkan ke Firebase";
        setState({ data: null, loading: false, offline: true, error: msg });
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      if (refHandle.current) {
        off(refHandle.current);
        refHandle.current = null;
      }
    };
  }, []);

  return state;
}
