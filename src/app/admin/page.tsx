"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Database, Bell, FileText, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IssueReport, ContactPerson, AlarmThreshold } from "@/lib/types";

const cards = [
  {
    href: "/admin/firebase",
    icon: Database,
    title: "Firebase Config",
    desc: "Kelola konfigurasi Firebase SDK. Ganti API key tanpa redeploy.",
  },
  {
    href: "/admin/thresholds",
    icon: Bell,
    title: "Threshold Alarm",
    desc: "Atur batas SOC minimum, suhu panel, dan daya beban.",
  },
  {
    href: "/admin/reports",
    icon: FileText,
    title: "Kotak Laporan",
    desc: "Lihat dan kelola laporan masalah dari pengguna.",
  },
  {
    href: "/admin/contacts",
    icon: Users,
    title: "Contact Person",
    desc: "Kelola daftar contact person yang tampil ke pengguna.",
  },
];

export default function AdminOverviewPage() {
  const [openReports, setOpenReports] = useState<number | null>(null);
  const [activeContacts, setActiveContacts] = useState<number | null>(null);
  const [enabledThresholds, setEnabledThresholds] = useState<number | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [repRes, conRes, thrRes] = await Promise.all([
          fetch("/api/admin/reports"),
          fetch("/api/admin/contacts"),
          fetch("/api/admin/thresholds"),
        ]);
        if (cancelled) return;
        if (repRes.ok) {
          const reports = (await repRes.json()) as IssueReport[];
          setOpenReports(reports.filter((r) => r.status !== "resolved").length);
        }
        if (conRes.ok) {
          const contacts = (await conRes.json()) as ContactPerson[];
          setActiveContacts(contacts.filter((c) => c.isActive).length);
        }
        if (thrRes.ok) {
          const thresholds = (await thrRes.json()) as AlarmThreshold[];
          setEnabledThresholds(thresholds.filter((t) => t.enabled).length);
        }
      } catch {
        /* abaikan — badge menampilkan "–" jika gagal */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const fmt = (n: number | null) => (n === null ? "–" : n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Ikhtisar Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola konfigurasi dan operasional EnergiMon.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Badge variant="warning" className="gap-1">
          <FileText className="h-3 w-3" />
          {fmt(openReports)} laporan terbuka
        </Badge>
        <Badge variant="default" className="gap-1">
          <Users className="h-3 w-3" />
          {fmt(activeContacts)} contact aktif
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Bell className="h-3 w-3" />
          {fmt(enabledThresholds)} threshold aktif
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map(({ href, icon: Icon, title, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-semibold text-foreground normal-case tracking-normal">
                    {title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
