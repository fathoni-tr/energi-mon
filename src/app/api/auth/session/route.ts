import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "__session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

// POST — tukar ID token → session cookie
export async function POST(req: NextRequest) {
  let body: { idToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const { idToken } = body;
  if (!idToken) {
    return NextResponse.json({ error: "idToken wajib diisi" }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Wajib punya custom claim admin: true
    if (!decoded.admin) {
      return NextResponse.json(
        { error: "Akun ini tidak memiliki akses admin" },
        { status: 403 },
      );
    }

    // Simpan ID token sebagai session cookie (HttpOnly, Secure, SameSite=Strict)
    // ID token Firebase berlaku 1 jam; session cookie ini menyimpan token mentahnya
    // untuk diverifikasi ulang di setiap API call oleh firebase-admin.
    const res = NextResponse.json({ ok: true, uid: decoded.uid });
    res.cookies.set(SESSION_COOKIE, idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("[POST /api/auth/session]", err);
    const msg = err instanceof Error ? err.message : "Verifikasi token gagal";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}

// DELETE — logout, hapus session cookie
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
