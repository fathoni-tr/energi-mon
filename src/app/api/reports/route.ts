import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";
import { IssueReportSchema } from "@/lib/validators/report";
import { FieldValue } from "firebase-admin/firestore";

// Sederhana: rate-limit per IP menggunakan in-memory map (cukup untuk Vercel serverless)
const rateLimitMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 1000; // 1 menit

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = IssueReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const docRef = await adminFirestore.collection("issue_reports").add({
      ...parsed.data,
      status: "open",
      adminNote: null,
      routedTo: null,
      createdAt: FieldValue.serverTimestamp(),
      resolvedAt: null,
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/reports]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan laporan" },
      { status: 500 },
    );
  }
}
