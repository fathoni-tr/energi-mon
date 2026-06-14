"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ContactPerson } from "@/lib/types";

type FormData = {
  name: string;
  role: string;
  phone: string;
  isActive: boolean;
};
const EMPTY: FormData = { name: "", role: "", phone: "", isActive: true };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ContactPerson | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/admin/contacts");
      if (!res.ok) throw new Error();
      setContacts(await res.json());
    } catch {
      toast.error("Gagal memuat kontak");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(c: ContactPerson) {
    setEditing(c);
    setForm({
      name: c.name,
      role: c.role,
      phone: c.phone,
      isActive: c.isActive,
    });
    setOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = editing
        ? await fetch(`/api/admin/contacts?id=${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, sortOrder: editing.sortOrder }),
          })
        : await fetch("/api/admin/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, sortOrder: contacts.length }),
          });

      if (!res.ok)
        throw new Error(
          ((await res.json()) as { error?: string }).error ?? "Gagal",
        );
      toast.success(
        editing ? "Contact person diperbarui" : "Contact person ditambahkan",
        {
          description: form.name,
        },
      );
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/contacts?id=${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Contact person dihapus");
      await load();
    } catch {
      toast.error("Gagal menghapus kontak");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Contact Person
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kontak yang tampil ke pengguna setelah submit laporan masalah.
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tambah
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => (
            <Card key={c.id} className={!c.isActive ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {c.name}
                    </p>
                    <Badge
                      variant={c.isActive ? "default" : "outline"}
                      className="text-xs"
                    >
                      {c.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.role}</p>
                  <p className="text-xs text-muted-foreground metric">
                    {c.phone}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(c)}
                    className="h-8 w-8"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(c.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {contacts.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Belum ada contact person.
            </p>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Contact Person" : "Tambah Contact Person"}
            </DialogTitle>
            <DialogDescription>
              Lengkapi nama, jabatan, dan nomor WhatsApp contact person.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {(["name", "role", "phone"] as const).map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={key} className="capitalize">
                  {key === "phone" ? "No. HP / WhatsApp" : key}
                </Label>
                <Input
                  id={key}
                  placeholder={key === "phone" ? "628xxxxxxxxx" : undefined}
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="isActive">Aktif (tampil ke pengguna)</Label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name || !form.phone || saving}
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Contact Person</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Contact person yang dihapus
              tidak akan tampil ke pengguna.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
