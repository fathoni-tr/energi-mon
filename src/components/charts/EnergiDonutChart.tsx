"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/colors";
import { useChartAnimation, CHART_ANIMATION } from "@/lib/motion";
import { useCountUp } from "@/lib/hooks/use-count-up";

interface EnergiDonutChartProps {
  pltsKwh: number;
  pltbKwh: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card p-3 text-xs shadow-lg">
      <p className="metric" style={{ color: payload[0].payload.color }}>
        {payload[0].name}: {formatNumber(payload[0].value, 2)} kWh
      </p>
    </div>
  );
}

export function EnergiDonutChart({ pltsKwh, pltbKwh }: EnergiDonutChartProps) {
  const animate = useChartAnimation();
  const total = pltsKwh + pltbKwh || 1;
  const displayTotal = useCountUp(total);
  const data = [
    { name: "PLTS", value: pltsKwh, color: CHART_COLORS.plts },
    { name: "PLTB", value: pltbKwh, color: CHART_COLORS.pltb },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kontribusi Energi Hari Ini</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Gauge setengah lingkaran */}
        <div className="relative h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={data}
                cx="50%"
                cy="85%"
                startAngle={180}
                endAngle={0}
                innerRadius={64}
                outerRadius={100}
                paddingAngle={2}
                cornerRadius={3}
                dataKey="value"
                isAnimationActive={animate}
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.9} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Label di tengah busur */}
          <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center pointer-events-none">
            <p className="metric text-3xl font-bold text-foreground leading-none">
              {formatNumber(displayTotal ?? total, 1)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">kWh</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: d.color }}
              />
              <span className="text-xs text-muted-foreground">
                {d.name}{" "}
                <span className="metric font-medium text-foreground">
                  {formatNumber((d.value / total) * 100, 1)}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
