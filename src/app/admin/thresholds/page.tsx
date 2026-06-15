"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { AlarmThreshold } from "@/lib/types";

const METRIC_LABELS: Record<AlarmThreshold["metric"], string> = {
  soc_min: "SOC Minimum Baterai",
  panel_temp_max: "Suhu Panel Maksimum",
  load_p_max: "Daya Beban Maksimum",
  wind_max: "Kecepatan Angin Maksimum",
};

/** Nilai default yang dibuat saat admin pertama kali men-seed threshold. */
const DEFAULT_THRESHOLDS: Omit<AlarmThreshold, "id">[] = [
  { metric: "soc_min", value: 20, unit: "%", enabled: true },
  { metric: "panel_temp_max", value: 75, unit: "°C", enabled: true },
  { metric: "load_p_max", value: 5000, unit: "W", enabled: true },
  { metric: "wind_max", value: 20, unit: "m/s", enabled: false },
];

export default function ThresholdsPage() {
  const [thresholds, setThresholds] = useState<AlarmThreshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AlarmThreshold | null>(null);
  const [editValue, setEditValue] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/admin/thresholds");
      if (!res.ok) throw new Error();
      setThresholds(await res.json());
    } catch {
      toast.error("Gagal memuat threshold");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveAll(updated: AlarmThreshold[]) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/thresholds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated.map(({ id: _id, ...t }) => t)),
      });
      if (!res.ok)
        throw new Error(
          ((await res.json()) as { error?: string }).error ?? "Gagal",
        );
      setThresholds(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function seedDefaults() {
    await saveAll(DEFAULT_THRESHOLDS.map((t) => ({ ...t, id: t.metric })));
    toast.success("Threshold default ditambahkan", {
      description: "4 threshold standar dibuat. Silakan sesuaikan nilainya.",
    });
  }

  function startEdit(t: AlarmThreshold) {
    setEditing(t);
    setEditValue(String(t.value));
  }

  async function handleSave() {
    if (!editing) return;
    const newValue = Number(editValue);
    const updated = thresholds.map((t) =>
      t.id === editing.id ? { ...t, value: newValue } : t,
    );
    await saveAll(updated);
    toast.success("Threshold disimpan", {
      description: `${METRIC_LABELS[editing.metric]}: ${editValue} ${editing.unit}`,
    });
    setEditing(null);
    setConfirmOpen(false);
  }

  async function toggleEnabled(id: string) {
    const target = thresholds.find((t) => t.id === id);
    if (!target) return;
    const updated = thresholds.map((t) =>
      t.id === id ? { ...t, enabled: !t.enabled } : t,
    );
    await saveAll(updated);
    toast.success(
      target.enabled ? "Threshold dinonaktifkan" : "Threshold diaktifkan",
      {
        description: METRIC_LABELS[target.metric],
      },
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Threshold Alarm
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atur batas nilai yang memicu alarm pada dashboard.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : (
        <div className="space-y-3">
          {thresholds.map((t) => (
            <Card key={t.id} className={!t.enabled ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {METRIC_LABELS[t.metric]}
                  </p>
                  <p className="metric text-xl font-bold mt-0.5">
                    {t.value}{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      {t.unit}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.enabled ? "default" : "outline"}>
                    {t.enabled ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(t)}
                    disabled={saving}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEnabled(t.id)}
                    disabled={saving}
                  >
                    {t.enabled ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {thresholds.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">
                Belum ada threshold tersimpan.
              </p>
              <Button onClick={seedDefaults} disabled={saving}>
                {saving ? "Menyimpan..." : "Tambah Threshold Default"}
              </Button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit Threshold: {METRIC_LABELS[editing.metric]}
              </DialogTitle>
              <DialogDescription>
                Masukkan nilai batas baru. Konfirmasi sebelum disimpan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 my-2">
              <Label>Nilai ({editing.unit})</Label>
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Batal
              </Button>
              <Button onClick={() => setConfirmOpen(true)}>Lanjutkan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan Threshold</DialogTitle>
            <DialogDescription>
              Mengubah threshold alarm dapat mempengaruhi notifikasi sistem.
              Lanjutkan menyimpan nilai{" "}
              <strong>
                {editValue} {editing?.unit}
              </strong>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
