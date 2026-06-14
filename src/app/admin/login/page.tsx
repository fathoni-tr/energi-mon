"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFirebaseApp } from "@/lib/firebase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const app = await getFirebaseApp();
      const auth = getAuth(app);
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Login gagal");
      }

      toast.success("Login berhasil");
      const redirect = searchParams.get("redirect") ?? "/admin";
      router.push(redirect);
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Login gagal. Periksa email dan password.";

      const firebaseErrors: Record<string, string> = {
        "auth/invalid-email": "Format email tidak valid",
        "auth/user-not-found": "Akun tidak ditemukan",
        "auth/wrong-password": "Password salah",
        "auth/invalid-credential": "Email atau password salah",
        "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
        "auth/network-request-failed": "Gagal terhubung ke server",
      };

      const code = (err as { code?: string }).code;
      const friendlyMsg = code ? (firebaseErrors[code] ?? msg) : msg;
      setError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login Admin</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          EnergiMon — Panel Administrasi
        </p>
      </CardHeader>
      <CardContent>
        {expired && (
          <p className="mb-4 text-xs text-warning rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
            Sesi Anda telah berakhir. Silakan login kembali.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Memverifikasi..." : "Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-sm">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Memuat...
            </CardContent>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
