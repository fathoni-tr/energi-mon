import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase/admin";
import { verifyAdminSession } from "@/lib/firebase/auth-server";

export const dynamic = "force-dynamic";
import { encrypt } from "@/lib/crypto";
import { FirebaseConfigSchema } from "@/lib/validators/config";
import { FieldValue } from "firebase-admin/firestore";

const ENCRYPTED_FIELDS = [
  "apiKey",
  "authDomain",
  "databaseURL",
  "storageBucket",
  "appId",
] as const;

export async function PUT(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (auth.error) return auth.error;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = FirebaseConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Konfigurasi tidak valid", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const config = parsed.data;

  try {
    const configRef = adminFirestore
      .collection("app_settings")
      .doc("firebase_config");

    // Snapshot config lama ke history sebelum menimpa
    const existing = await configRef.get();
    if (existing.exists) {
      await adminFirestore.collection("firebase_config_history").add({
        ...existing.data(),
        archivedAt: FieldValue.serverTimestamp(),
      });
    }

    // Enkripsi field sensitif, simpan projectId plaintext (bukan secret)
    const toSave: Record<string, string> = {
      projectId: config.projectId,
    };
    for (const field of ENCRYPTED_FIELDS) {
      toSave[field] = encrypt(config[field]);
    }

    await configRef.set({
      ...toSave,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/admin/firebase-config]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan konfigurasi" },
      { status: 500 },
    );
  }
}
