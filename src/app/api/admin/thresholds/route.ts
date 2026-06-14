import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase/admin";
import { verifyAdminSession } from "@/lib/firebase/auth-server";

export const dynamic = "force-dynamic";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const ThresholdSchema = z.object({
  metric: z.enum(["soc_min", "panel_temp_max", "load_p_max", "wind_max"]),
  value: z.number().finite(),
  unit: z.string().min(1).max(20),
  enabled: z.boolean(),
});

const ThresholdsArraySchema = z.array(ThresholdSchema).min(1);

// GET — semua threshold
export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (auth.error) return auth.error;
  try {
    const snap = await adminFirestore.collection("thresholds").get();
    const thresholds = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(thresholds);
  } catch (err) {
    console.error("[GET /api/admin/thresholds]", err);
    return NextResponse.json(
      { error: "Gagal mengambil threshold" },
      { status: 500 },
    );
  }
}

// PUT — simpan seluruh array threshold (upsert per metric)
export async function PUT(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (auth.error) return auth.error;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = ThresholdsArraySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const batch = adminFirestore.batch();
    for (const threshold of parsed.data) {
      const docRef = adminFirestore
        .collection("thresholds")
        .doc(threshold.metric);
      batch.set(docRef, {
        ...threshold,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/admin/thresholds]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan threshold" },
      { status: 500 },
    );
  }
}
