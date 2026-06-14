import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dailyEnergy } from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS, withAlpha } from "@/lib/colors";
import type { HistoryPoint } from "@/lib/types";

interface EnergyBalanceCardProps {
  data: HistoryPoint[];
}

function Bar({
  label,
  kwh,
  max,
  color,
}: {
  label: string;
  kwh: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, (kwh / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="metric text-sm font-semibold text-foreground">
          {formatNumber(kwh, 1)} kWh
        </span>
      </div>
      <div className="h-3.5 w-full overflow-hidden rounded-sm border border-border bg-muted">
        <div
          className="h-full rounded-sm transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${withAlpha(color, 0.65)})`,
          }}
        />
      </div>
    </div>
  );
}

export function EnergyBalanceCard({ data }: EnergyBalanceCardProps) {
  const { pltsKwh, pltbKwh, genKwh, loadKwh, surplusKwh, selfSufficiency } =
    dailyEnergy(data);
  const max = Math.max(genKwh, loadKwh, 1);
  const surplus = surplusKwh >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neraca Energi Hari Ini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="space-y-3">
          <Bar
            label="Pembangkitan"
            kwh={genKwh}
            max={max}
            color={CHART_COLORS.batt}
          />
          {/* Konsumsi = operasi normal (ungu); merah hanya untuk defisit */}
          <Bar
            label="Konsumsi"
            kwh={loadKwh}
            max={max}
            color={CHART_COLORS.load}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground">
              {surplus ? "Surplus" : "Defisit"}
            </p>
            <p
              className={
                "metric text-xl font-bold " +
                (surplus ? "text-primary" : "text-destructive")
              }
            >
              {surplus ? "+" : "−"}
              {formatNumber(Math.abs(surplusKwh), 1)} kWh
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kemandirian</p>
            <p className="metric text-xl font-bold text-foreground">
              {formatNumber(selfSufficiency, 0)}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: CHART_COLORS.plts }}
            />
            PLTS{" "}
            <span className="metric font-medium text-foreground">
              {formatNumber(pltsKwh, 1)} kWh
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: CHART_COLORS.pltb }}
            />
            PLTB{" "}
            <span className="metric font-medium text-foreground">
              {formatNumber(pltbKwh, 1)} kWh
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
