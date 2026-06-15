import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

/**
 * GET publik — daftar contact person AKTIF untuk ditampilkan ke pengguna
 * (mis. setelah submit laporan masalah). Hanya field aman yang dipublikasikan.
 *
 * Filter `isActive` + urut `sortOrder` dilakukan in-memory agar tidak butuh
 * composite index Firestore. Collection contacts kecil sehingga ini murah.
 */
export async function GET() {
  try {
    const snap = await adminFirestore.collection("contacts").get();
    const contacts = snap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: String(d.name ?? ""),
          role: String(d.role ?? ""),
          phone: String(d.phone ?? ""),
          isActive: Boolean(d.isActive),
          sortOrder: typeof d.sortOrder === "number" ? d.sortOrder : 0,
        };
      })
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ id, name, role, phone }) => ({ id, name, role, phone }));

    return NextResponse.json(contacts, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    console.error("[GET /api/contacts]", err);
    return NextResponse.json(
      { error: "Gagal mengambil kontak" },
      { status: 500 },
    );
  }
}
