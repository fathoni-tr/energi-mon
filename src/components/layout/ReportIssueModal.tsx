"use client";

import { useState, useEffect } from "react";
import { MessageSquarePlus, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CATEGORY_LABELS } from "@/lib/mock-data";
import type { IssueReport } from "@/lib/types";

type Category = IssueReport["category"];
type PublicContact = { id: string; name: string; role: string; phone: string };

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "data_not_updating", label: CATEGORY_LABELS.data_not_updating },
  { value: "sensor_anomaly", label: CATEGORY_LABELS.sensor_anomaly },
  { value: "display_issue", label: CATEGORY_LABELS.display_issue },
  { value: "other", label: CATEGORY_LABELS.other },
];

export function ReportIssueModal() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState<PublicContact[]>([]);
  const [form, setForm] = useState({
    reporterName: "",
    reporterContact: "",
    category: "" as Category | "",
    description: "",
  });
  const [error, setError] = useState("");

  // Ambil contact person aktif dari Firestore (via API publik) saat modal dibuka.
  useEffect(() => {
    if (!open || contacts.length > 0) return;
    let cancelled = false;
    fetch("/api/contacts")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (!cancelled) setContacts(Array.isArray(d) ? d : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, contacts.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.description.trim().length < 10) {
      setError("Deskripsi minimal 10 karakter.");
      return;
    }
    if (!form.category) {
      setError("Pilih kategori masalah.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterName: form.reporterName.trim() || null,
          reporterContact: form.reporterContact.trim() || null,
          category: form.category,
          description: form.description.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Gagal mengirim laporan");
      }
      setSubmitted(true);
      toast.success("Laporan terkirim", {
        description: "Tim operasi akan menindaklanjuti laporan Anda.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim laporan";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpen(v: boolean) {
    setOpen(v);
    if (!v) {
      setSubmitted(false);
      setForm({
        reporterName: "",
        reporterContact: "",
        category: "",
        description: "",
      });
      setError("");
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Laporkan Masalah
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-w-md">
          {!submitted ? (
            <>
              <DialogHeader>
                <DialogTitle>Laporkan Masalah</DialogTitle>
                <DialogDescription>
                  Isi form di bawah untuk melaporkan masalah kepada tim operasi.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="rep-name">Nama (opsional)</Label>
                  <Input
                    id="rep-name"
                    placeholder="Nama Anda"
                    value={form.reporterName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reporterName: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rep-contact">Kontak (opsional)</Label>
                  <Input
                    id="rep-contact"
                    placeholder="No. HP atau email"
                    value={form.reporterContact}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reporterContact: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rep-category">Kategori</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, category: v as Category }))
                    }
                  >
                    <SelectTrigger id="rep-category">
                      <SelectValue placeholder="Pilih kategori..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rep-desc">Deskripsi masalah</Label>
                  <Textarea
                    id="rep-desc"
                    placeholder="Jelaskan masalah yang Anda temukan (minimal 10 karakter)..."
                    rows={4}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />
                </div>

                {error && <p className="text-xs text-destructive">{error}</p>}

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Mengirim..." : "Kirim Laporan"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Laporan Terkirim</DialogTitle>
                <DialogDescription>
                  Terima kasih. Laporan Anda sudah diterima oleh tim operasi.
                </DialogDescription>
              </DialogHeader>

              {contacts.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Hubungi langsung:
                  </p>
                  <Separator />
                  {contacts.map((cp) => (
                    <div
                      key={cp.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">{cp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cp.role}
                        </p>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        <a
                          href={`https://wa.me/${cp.phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Phone className="h-3 w-3" />
                          WhatsApp
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end mt-4">
                <Button onClick={() => handleOpen(false)}>Tutup</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
