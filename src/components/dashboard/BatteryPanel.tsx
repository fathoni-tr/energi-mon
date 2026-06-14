"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatWatt } from "@/lib/utils";
import { CHART_COLORS, UI_COLORS, withAlpha } from "@/lib/colors";
import type { BattData } from "@/lib/types";

interface BatteryPanelProps {
  data: BattData | null;
}

function BattRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="metric text-sm font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}

export function BatteryPanel({ data }: BatteryPanelProps) {
  // <20% bahaya (merah), 20-40% perlu perhatian (oranye), >=40% sehat (hijau)
  const socColor = !data
    ? UI_COLORS.axis
    : data.soc < 20
      ? UI_COLORS.danger
      : data.soc < 40
        ? UI_COLORS.warning
        : CHART_COLORS.batt;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan Baterai</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative h-9 flex-1 rounded-md border border-border bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-md transition-all duration-500"
                  style={{
                    width: `${data.soc}%`,
                    background: `linear-gradient(90deg, ${withAlpha(socColor, 0.7)}, ${withAlpha(socColor, 0.45)})`,
                  }}
                />
                <span
                  className="absolute inset-0 flex items-center justify-center metric text-sm font-bold"
                  style={{ color: socColor }}
                >
                  {formatNumber(data.soc, 0)}% SOC
                </span>
              </div>
            </div>

            <div>
              <BattRow
                label="Tegangan"
                value={`${formatNumber(data.v, 1)} V`}
              />
              <BattRow
                label="Arus"
                value={`${formatNumber(data.i, 1)} A ${data.i < 0 ? "(Mengalirkan)" : data.i > 0 ? "(Mengisi)" : ""}`}
              />
              <BattRow
                label="Daya Masuk (P_in)"
                value={formatWatt(data.p_in)}
              />
              <BattRow
                label="Daya Keluar (P_out)"
                value={formatWatt(data.p_out)}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Menunggu data...</p>
        )}
      </CardContent>
    </Card>
  );
}
