"use client";

import {
  initializeApp,
  getApps,
  deleteApp,
  type FirebaseApp,
} from "firebase/app";
import type { FirebaseConfig } from "@/lib/types";

let _app: FirebaseApp | null = null;
let _config: FirebaseConfig | null = null;

async function fetchConfig(): Promise<FirebaseConfig> {
  const res = await fetch("/api/firebase-config", { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal mengambil konfigurasi Firebase");
  return res.json() as Promise<FirebaseConfig>;
}

export async function getFirebaseApp(): Promise<FirebaseApp> {
  if (_app) return _app;

  const config = await fetchConfig();
  _config = config;

  const existing = getApps().find((a) => a.name === "[DEFAULT]");
  if (existing) {
    _app = existing;
    return _app;
  }

  _app = initializeApp(config);
  return _app;
}

/**
 * Ganti konfigurasi Firebase saat runtime (setelah admin simpan config baru).
 * Menghapus app lama dan menginisialisasi ulang dengan config baru.
 */
export async function reinitializeFirebase(
  newConfig: FirebaseConfig,
): Promise<FirebaseApp> {
  if (_app) {
    await deleteApp(_app);
    _app = null;
  }
  _config = newConfig;
  _app = initializeApp(newConfig);
  return _app;
}

export function getCurrentConfig(): FirebaseConfig | null {
  return _config;
}
