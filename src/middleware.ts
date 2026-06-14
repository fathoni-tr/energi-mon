import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "__session";
const LOGIN_PATH = "/admin/login";

/**
 * Cek apakah JWT token belum expired berdasarkan klaim `exp`.
 * Ini BUKAN verifikasi kriptografis — hanya cek waktu.
 * Verifikasi penuh (tanda tangan + claim) dilakukan di masing-masing API route
 * via firebase-admin `verifyIdToken()`.
 */
function isTokenStructurallyValid(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    if (typeof payload.exp !== "number") return false;
    // Sediakan 30 detik buffer untuk clock skew
    return payload.exp > Math.floor(Date.now() / 1000) + 30;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Biarkan halaman login lewat tanpa cek
  if (pathname === LOGIN_PATH) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  // Tidak ada cookie → redirect ke login
  if (!sessionCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token sudah expired secara struktural → redirect
  if (!isTokenStructurallyValid(sessionCookie)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_PATH;
    loginUrl.searchParams.set("expired", "1");
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
  }

  // Teruskan request; API route admin akan melakukan verifikasi penuh via firebase-admin
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
