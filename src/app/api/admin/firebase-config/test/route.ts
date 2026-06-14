import { NextRequest, NextResponse } from "next/server";
import { initializeApp, deleteApp, getApps } from "firebase/app";

export const dynamic = "force-dynamic";
import { getDatabase, ref, get } from "firebase/database";
import { verifyAdminSession } from "@/lib/firebase/auth-server";
import { FirebaseConfigSchema } from "@/lib/validators/config";

export async function POST(req: NextRequest) {
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

  // Gunakan nama app sementara agar tidak konflik dengan app utama
  const testAppName = `config-test-${Date.now()}`;
  const existing = getApps().find((a) => a.name === testAppName);
  const testApp = existing ?? initializeApp(parsed.data, testAppName);

  try {
    const db = getDatabase(testApp);
    const liveRef = ref(db, "live/ts");
    const snapshot = await get(liveRef);

    if (!snapshot.exists()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Koneksi berhasil tapi data /live/ts tidak ditemukan",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: true, ts: snapshot.val() });
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Gagal terhubung ke Firebase";
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  } finally {
    await deleteApp(testApp).catch(() => {});
  }
}
