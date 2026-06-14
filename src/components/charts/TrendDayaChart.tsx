"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime, formatNumber } from "@/lib/utils";
import { CHART_COLORS, UI_COLORS } from "@/lib/colors";
import { useChartAnimation, CHART_ANIMATION } from "@/lib/motion";
import type { HistoryPoint } from "@/lib/types";

interface TrendDayaChartProps {
  data: HistoryPoint[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card p-3 text-xs shadow-lg">
      <p className="mb-1 font-medium text-muted-foreground metric">
        {label ? formatTime(label) : ""}
      </p>
      {payload.map((p) => (
        <p key={p.name} className="metric" style={{ color: p.color }}>
          {p.name}: {formatNumber(p.value, 0)} W
        </p>
      ))}
    </div>
  );
}

const axisTick = {
  fontSize: 12,
  fill: UI_COLORS.axis,
  fontFamily: "var(--font-mono)",
};

export function TrendDayaChart({ data }: TrendDayaChartProps) {
  const animate = useChartAnimation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Daya 24 Jam</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={UI_COLORS.grid}
                vertical={false}
              />
              <XAxis
                dataKey="epoch"
                tickFormatter={formatTime}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v: number) => `${v}W`}
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={56}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => (
                  <span style={{ fontSize: 12, color: UI_COLORS.axis }}>
                    {value}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="plts_p"
                name="PLTS"
                stroke={CHART_COLORS.plts}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={animate}
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
              <Line
                type="monotone"
                dataKey="pltb_p"
                name="PLTB"
                stroke={CHART_COLORS.pltb}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={animate}
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
              <Line
                type="monotone"
                dataKey="load_p"
                name="Beban"
                stroke={CHART_COLORS.load}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                isAnimationActive={animate}
                animationDuration={CHART_ANIMATION.duration}
                animationEasing={CHART_ANIMATION.easing}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
