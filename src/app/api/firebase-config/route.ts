import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
import { decrypt } from "@/lib/crypto";
import type { FirebaseConfig } from "@/lib/types";

const ENCRYPTED_FIELDS = [
  "apiKey",
  "authDomain",
  "databaseURL",
  "storageBucket",
  "appId",
] as const;

export async function GET() {
  try {
    const snap = await adminFirestore
      .collection("app_settings")
      .doc("firebase_config")
      .get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Konfigurasi Firebase belum diatur" },
        { status: 404 },
      );
    }

    const raw = snap.data() as Record<string, string>;
    const config: Partial<FirebaseConfig> = { projectId: raw.projectId };

    for (const field of ENCRYPTED_FIELDS) {
      if (!raw[field]) {
        return NextResponse.json(
          { error: `Field ${field} tidak ditemukan di konfigurasi` },
          { status: 500 },
        );
      }
      config[field] = decrypt(raw[field]);
    }

    return NextResponse.json(config as FirebaseConfig, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[GET /api/firebase-config]", err);
    return NextResponse.json(
      { error: "Gagal membaca konfigurasi" },
      { status: 500 },
    );
  }
}
