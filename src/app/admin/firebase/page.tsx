"use client";

import { useState } from "react";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reinitializeFirebase } from "@/lib/firebase/client";

interface ConfigForm {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  appId: string;
}

const EMPTY: ConfigForm = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  appId: "",
};

type TestStatus = "idle" | "testing" | "ok" | "fail";

export default function FirebaseConfigPage() {
  const [form, setForm] = useState<ConfigForm>(EMPTY);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function set(key: keyof ConfigForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setTestStatus("idle");
    };
  }

  async function handleTest() {
    setTestStatus("testing");
    setTestError("");
    try {
      const res = await fetch("/api/admin/firebase-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setTestStatus("ok");
        toast.success("Koneksi berhasil", {
          description: "Database URL dapat dijangkau.",
        });
      } else {
        setTestStatus("fail");
        setTestError(data.error ?? "Koneksi gagal");
        toast.error("Koneksi gagal", { description: data.error });
      }
    } catch {
      setTestStatus("fail");
      toast.error("Gagal menghubungi server");
    }
  }

  async function handleSave() {
    setSaving(true);
    setConfirmOpen(false);
    try {
      const res = await fetch("/api/admin/firebase-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Gagal menyimpan");
      }

      // Re-init client SDK dengan config baru
      await reinitializeFirebase(form);

      toast.success("Konfigurasi disimpan", {
        description: "Dashboard akan reconnect dengan config baru.",
      });
      setForm(EMPTY);
      setTestStatus("idle");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan konfigurasi",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Firebase Config Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Perbarui konfigurasi Firebase SDK dashboard. Klik &quot;Test
          Koneksi&quot; sebelum menyimpan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Konfigurasi Firebase SDK</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              ["apiKey", "API Key", "AIzaSy..."],
              ["authDomain", "Auth Domain", "project.firebaseapp.com"],
              [
                "databaseURL",
                "Database URL",
                "https://project-rtdb.asia-southeast1.firebasedatabase.app",
              ],
              ["projectId", "Project ID", "my-project"],
              ["storageBucket", "Storage Bucket", "my-project.appspot.com"],
              ["appId", "App ID", "1:123456:web:abcdef"],
            ] as [keyof ConfigForm, string, string][]
          ).map(([key, label, placeholder]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                placeholder={placeholder}
                value={form[key]}
                onChange={set(key)}
                type={key === "apiKey" || key === "appId" ? "password" : "text"}
              />
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={
                testStatus === "testing" || !form.databaseURL || !form.apiKey
              }
            >
              {testStatus === "testing" ? "Menguji..." : "Test Koneksi"}
            </Button>

            {testStatus === "ok" && (
              <span className="flex items-center gap-1 text-xs text-primary">
                <CheckCircle className="h-4 w-4" /> Koneksi berhasil
              </span>
            )}
            {testStatus === "fail" && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <XCircle className="h-4 w-4" /> {testError || "Koneksi gagal"}
              </span>
            )}

            <Button
              className="ml-auto"
              disabled={testStatus !== "ok" || saving}
              onClick={() => setConfirmOpen(true)}
            >
              Simpan Config
            </Button>
          </div>

          {testStatus !== "ok" &&
            testStatus !== "idle" &&
            testStatus !== "testing" && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-warning" />
                Test koneksi harus berhasil sebelum dapat menyimpan.
              </p>
            )}
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Perbarui Config</DialogTitle>
            <DialogDescription>
              Config lama akan diarsipkan. Dashboard viewer akan reconnect
              otomatis dengan config baru. Lanjutkan?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Menyimpan..." : "Ya, Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
