import Link from "next/link";
import { Database, Bell, FileText, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockReports, mockContacts, mockThresholds } from "@/lib/mock-data";

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
  const openReports = mockReports.filter((r) => r.status !== "resolved").length;
  const activeContacts = mockContacts.filter((c) => c.isActive).length;
  const enabledThresholds = mockThresholds.filter((t) => t.enabled).length;

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
          {openReports} laporan terbuka
        </Badge>
        <Badge variant="default" className="gap-1">
          <Users className="h-3 w-3" />
          {activeContacts} contact aktif
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Bell className="h-3 w-3" />
          {enabledThresholds} threshold aktif
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
