import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE = "__session";

/**
 * Verifikasi penuh token session Firebase di API route.
 * Kembalikan { uid, error } — jika error ada, kirim response error langsung.
 */
export async function verifyAdminSession(
  req: NextRequest,
): Promise<
  { uid: string; error?: never } | { uid?: never; error: NextResponse }
> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Tidak terautentikasi" },
        { status: 401 },
      ),
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (!decoded.admin) {
      return {
        error: NextResponse.json({ error: "Bukan admin" }, { status: 403 }),
      };
    }
    return { uid: decoded.uid };
  } catch {
    return {
      error: NextResponse.json(
        { error: "Sesi tidak valid atau telah kedaluwarsa" },
        { status: 401 },
      ),
    };
  }
}
