"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Database,
  Bell,
  FileText,
  Users,
  History,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="gap-2 text-muted-foreground"
    >
      <LogOut className="h-4 w-4" />
      Keluar
    </Button>
  );
}

const adminNav = [
  { href: "/admin", label: "Ikhtisar", icon: Settings },
  { href: "/admin/firebase", label: "Firebase Config", icon: Database },
  { href: "/admin/thresholds", label: "Threshold Alarm", icon: Bell },
  { href: "/admin/reports", label: "Kotak Laporan", icon: FileText },
  { href: "/admin/historis", label: "Data Historis", icon: History },
  { href: "/admin/contacts", label: "Contact Person", icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar admin */}
      <aside className="hidden md:flex w-56 flex-col border-r border-border bg-card shrink-0">
        <div className="p-4">
          <Link href="/" className="text-sm font-bold text-primary">
            EnergiMon
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">Panel Admin</p>
        </div>
        <Separator />
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {adminNav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors " +
                (pathname === href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground")
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-3 flex items-center justify-between">
          <LogoutButton />
          <ThemeToggle />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/admin" className="text-sm font-bold text-primary">
              Admin
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
