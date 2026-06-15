"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { getDatabase, ref, get } from "firebase/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFirebaseApp } from "@/lib/firebase/client";
import { HistoryPointSchema } from "@/lib/firebase/validators/telemetry";
import type { HistoryPoint } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

const MAX_RANGE_DAYS = 31;

/** Tanggal "YYYY-MM-DD" hari ini di WITA (UTC+8, lokasi Sabu Raijua). */
function todayWita(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Semua tanggal "YYYY-MM-DD" dalam rentang [from, to] inklusif. */
function datesInRange(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (d <= end && out.length < MAX_RANGE_DAYS) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export default function HistorisPage() {
  const today = todayWita();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dateFrom > dateTo) {
      setData([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function fetchRange() {
      setLoading(true);
      try {
        const app = await getFirebaseApp();
        if (cancelled) return;
        const db = getDatabase(app);
        const points: HistoryPoint[] = [];

        for (const date of datesInRange(dateFrom, dateTo)) {
          const snap = await get(ref(db, `history/${date}`));
          if (cancelled) return;
          if (!snap.exists()) continue;
          const raw = snap.val() as Record<string, unknown>;
          for (const [epochKey, value] of Object.entries(raw)) {
            const parsed = HistoryPointSchema.safeParse({
              epoch: Number(epochKey),
              ...(value as object),
            });
            if (parsed.success) points.push(parsed.data);
          }
        }

        points.sort((a, b) => a.epoch - b.epoch);
        if (!cancelled) setData(points);
      } catch (err) {
        if (!cancelled) {
          console.error("[HistorisPage]", err);
          toast.error("Gagal memuat data historis");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRange();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  function exportCsv() {
    const header = "Waktu,PLTS (W),PLTB (W),Baterai (W),SOC (%),Beban (W)\n";
    const rows = data
      .map((h) =>
        [
          new Date(h.epoch * 1000).toISOString(),
          h.plts_p,
          h.pltb_p,
          h.batt_p,
          h.batt_soc.toFixed(1),
          h.load_p,
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historis_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV diunduh", {
      description: `${data.length} titik data diekspor.`,
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-foreground">Data Historis</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <CardTitle>Filter Rentang Tanggal</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              className="gap-2"
              disabled={data.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="date-from">Dari</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-to">Sampai</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {loading
              ? "Memuat data dari Firebase..."
              : `${data.length} titik data (waktu WITA, maks ${MAX_RANGE_DAYS} hari)`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Memuat...
            </p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Tidak ada data pada rentang yang dipilih.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>PLTS (W)</TableHead>
                  <TableHead>PLTB (W)</TableHead>
                  <TableHead>Baterai (W)</TableHead>
                  <TableHead>SOC (%)</TableHead>
                  <TableHead>Beban (W)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(-200).map((h) => (
                  <TableRow key={h.epoch}>
                    <TableCell className="metric text-xs text-muted-foreground">
                      {new Date(h.epoch * 1000).toLocaleString("id-ID", {
                        timeZone: "Asia/Makassar",
                      })}
                    </TableCell>
                    <TableCell className="metric">
                      {formatNumber(h.plts_p, 0)}
                    </TableCell>
                    <TableCell className="metric">
                      {formatNumber(h.pltb_p, 0)}
                    </TableCell>
                    <TableCell className="metric">
                      {formatNumber(h.batt_p, 0)}
                    </TableCell>
                    <TableCell className="metric">
                      {formatNumber(h.batt_soc, 1)}
                    </TableCell>
                    <TableCell className="metric">
                      {formatNumber(h.load_p, 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
