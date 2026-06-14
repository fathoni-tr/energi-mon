"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
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
import { mockHistory } from "@/lib/mock-data";
import { formatNumber } from "@/lib/utils";

export default function HistorisPage() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const filtered = mockHistory.filter((h) => {
    const d = new Date(h.epoch * 1000).toISOString().split("T")[0];
    return d >= dateFrom && d <= dateTo;
  });

  function exportCsv() {
    const header = "Waktu,PLTS (W),PLTB (W),Baterai (W),SOC (%),Beban (W)\n";
    const rows = filtered
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
      description: `${filtered.length} titik data diekspor.`,
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
              disabled={filtered.length === 0}
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
            {filtered.length} titik data
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filtered.length === 0 ? (
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
                {filtered.slice(-200).map((h) => (
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
