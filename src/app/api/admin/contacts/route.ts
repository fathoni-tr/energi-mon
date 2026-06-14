import { NextRequest, NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase/admin";
import { verifyAdminSession } from "@/lib/firebase/auth-server";

export const dynamic = "force-dynamic";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  phone: z
    .string()
    .min(8)
    .max(20)
    .regex(/^\+?[\d\s\-()]+$/, "Format nomor tidak valid"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

// GET — daftar semua kontak
export async function GET(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (auth.error) return auth.error;
  try {
    const snap = await adminFirestore
      .collection("contacts")
      .orderBy("sortOrder")
      .get();

    const contacts = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(contacts);
  } catch (err) {
    console.error("[GET /api/admin/contacts]", err);
    return NextResponse.json(
      { error: "Gagal mengambil kontak" },
      { status: 500 },
    );
  }
}

// POST — tambah kontak baru
export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (auth.error) return auth.error;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const docRef = await adminFirestore.collection("contacts").add({
      ...parsed.data,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/contacts]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan kontak" },
      { status: 500 },
    );
  }
}

// PUT — update kontak (id di query param)
export async function PUT(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (auth.error) return auth.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "Parameter id wajib diisi" },
      { status: 400 },
    );

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
  }

  const parsed = ContactSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    await adminFirestore.collection("contacts").doc(id).update(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/admin/contacts]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui kontak" },
      { status: 500 },
    );
  }
}

// DELETE — hapus kontak (id di query param)
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (auth.error) return auth.error;
  const id = new URL(req.url).searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "Parameter id wajib diisi" },
      { status: 400 },
    );

  try {
    await adminFirestore.collection("contacts").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/contacts]", err);
    return NextResponse.json(
      { error: "Gagal menghapus kontak" },
      { status: 500 },
    );
  }
}
