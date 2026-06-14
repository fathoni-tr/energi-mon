import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase/admin";
import { verifyAdminSession } from "@/lib/firebase/auth-server";

export const dynamic = "force-dynamic";
import { ReportStatusSchema } from "@/lib/validators/report";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

// GET — daftar semua laporan (terbaru di atas, maks 100)
export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (auth.error) return auth.error;
  try {
    const snap = await adminFirestore
      .collection("issue_reports")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const reports = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
        resolvedAt: data.resolvedAt?.toDate?.().toISOString() ?? null,
      };
    });

    return NextResponse.json(reports);
  } catch (err) {
    console.error("[GET /api/admin/reports]", err);
    return NextResponse.json(
      { error: "Gagal mengambil laporan" },
      { status: 500 },
    );
  }
}

// PATCH — update status laporan
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Parameter id wajib diisi" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = ReportStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const docRef = adminFirestore.collection("issue_reports").doc(id);
    const update: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.status === "resolved") {
      update.resolvedAt = FieldValue.serverTimestamp();
    }

    await docRef.update(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) throw err;
    console.error("[PATCH /api/admin/reports]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui laporan" },
      { status: 500 },
    );
  }
}
