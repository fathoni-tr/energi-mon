"use client";

import { ArrowRight, Sun, Wind, Battery, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWatt, formatNumber } from "@/lib/utils";
import { CHART_COLORS, UI_COLORS, withAlpha } from "@/lib/colors";
import type { LiveData } from "@/lib/types";

interface PowerFlowPanelProps {
  data: LiveData | null;
}

function FlowNode({
  icon: Icon,
  label,
  power,
  color,
}: {
  icon: React.ElementType;
  label: string;
  power: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-lg border"
        style={{
          borderColor: withAlpha(color, 0.25),
          backgroundColor: withAlpha(color, 0.08),
        }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="metric text-sm font-semibold text-foreground">
        {formatWatt(power)}
      </p>
    </div>
  );
}

function FlowArrow({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-1">
      <ArrowRight
        className={
          "h-5 w-5 transition-colors " + (active ? "animate-pulse" : "")
        }
        style={{ color: active ? color : UI_COLORS.grid }}
      />
    </div>
  );
}

export function PowerFlowPanel({ data }: PowerFlowPanelProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aliran Daya</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Menunggu data...</p>
        </CardContent>
      </Card>
    );
  }

  const isCharging = data.batt.i > 0;
  const isDischarging = data.batt.i < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aliran Daya</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-2 py-2 flex-wrap sm:flex-nowrap">
          <div className="flex flex-col items-center gap-3">
            <FlowNode
              icon={Sun}
              label="PLTS"
              power={data.plts.p}
              color={CHART_COLORS.plts}
            />
            <FlowNode
              icon={Wind}
              label="PLTB"
              power={data.pltb.p}
              color={CHART_COLORS.pltb}
            />
          </div>

          {/* Sumber -> baterai: aktif saat ada pembangkitan */}
          <FlowArrow
            active={data.plts.p + data.pltb.p > 0}
            color={CHART_COLORS.batt}
          />

          <FlowNode
            icon={Battery}
            label={`Baterai ${formatNumber(data.batt.soc, 0)}%`}
            power={Math.abs(data.batt.i * data.batt.v)}
            color={CHART_COLORS.batt}
          />

          {/* Baterai -> beban: arah fisik selalu ke beban; ungu = konsumsi normal */}
          <FlowArrow active={data.load.p > 0} color={CHART_COLORS.load} />

          <FlowNode
            icon={Zap}
            label="Output Inverter"
            power={data.load.p}
            color={CHART_COLORS.load}
          />
        </div>

        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>
            Baterai:{" "}
            <span className={isCharging ? "text-primary" : "text-foreground"}>
              {isCharging ? "Mengisi" : isDischarging ? "Mengalirkan" : "Siaga"}
            </span>
          </span>
          <span>
            Mode:{" "}
            <span className="text-foreground capitalize">{data.sys.mode}</span>
          </span>
          <span
            className={
              data.sys.status === "normal"
                ? "text-primary"
                : data.sys.status === "warning"
                  ? "text-warning"
                  : "text-destructive"
            }
          >
            {data.sys.status.charAt(0).toUpperCase() + data.sys.status.slice(1)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
