"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IssueReport } from "@/lib/types";

const CATEGORY_LABELS: Record<IssueReport["category"], string> = {
  data_not_updating: "Data Tidak Update",
  sensor_anomaly: "Anomali Sensor",
  display_issue: "Masalah Tampilan",
  other: "Lainnya",
};

const STATUS_LABELS: Record<IssueReport["status"], string> = {
  open: "Terbuka",
  in_progress: "Diproses",
  resolved: "Selesai",
};

const STATUS_VARIANTS: Record<
  IssueReport["status"],
  "destructive" | "warning" | "default"
> = {
  open: "destructive",
  in_progress: "warning",
  resolved: "default",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | IssueReport["status"]>("all");

  async function load() {
    try {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) throw new Error();
      setReports(await res.json());
    } catch {
      toast.error("Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered =
    tab === "all" ? reports : reports.filter((r) => r.status === tab);

  async function changeStatus(id: string, status: IssueReport["status"]) {
    try {
      const res = await fetch(`/api/admin/reports?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                resolvedAt:
                  status === "resolved"
                    ? new Date().toISOString()
                    : r.resolvedAt,
              }
            : r,
        ),
      );
      toast.success("Status laporan diubah", {
        description: `Laporan ditandai "${STATUS_LABELS[status]}".`,
      });
    } catch {
      toast.error("Gagal memperbarui status");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Kotak Laporan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Laporan masalah dari pengguna dashboard.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Memuat...</p>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">Semua ({reports.length})</TabsTrigger>
            <TabsTrigger value="open">
              Terbuka ({reports.filter((r) => r.status === "open").length})
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              Diproses (
              {reports.filter((r) => r.status === "in_progress").length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Selesai ({reports.filter((r) => r.status === "resolved").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            <Card>
              <CardContent className="pt-0 p-0">
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Tidak ada laporan.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead>Deskripsi</TableHead>
                        <TableHead>Pelapor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs text-muted-foreground metric whitespace-nowrap">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleString("id-ID", {
                                  timeZone: "Asia/Makassar",
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {CATEGORY_LABELS[r.category]}
                          </TableCell>
                          <TableCell className="text-xs max-w-xs">
                            <p className="line-clamp-2">{r.description}</p>
                            {r.adminNote && (
                              <p className="text-muted-foreground mt-1 italic">
                                {r.adminNote}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {r.reporterName ?? (
                              <span className="text-muted-foreground italic">
                                Anonim
                              </span>
                            )}
                            {r.reporterContact && (
                              <span className="block text-muted-foreground">
                                {r.reporterContact}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANTS[r.status]}>
                              {STATUS_LABELS[r.status]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {r.status !== "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7"
                                  onClick={() =>
                                    changeStatus(r.id, "in_progress")
                                  }
                                >
                                  Proses
                                </Button>
                              )}
                              {r.status !== "resolved" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7 text-primary"
                                  onClick={() => changeStatus(r.id, "resolved")}
                                >
                                  Selesai
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
