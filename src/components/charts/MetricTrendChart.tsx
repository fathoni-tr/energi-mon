"use client";

import { useId } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime, formatNumber } from "@/lib/utils";
import { UI_COLORS } from "@/lib/colors";
import { useChartAnimation, CHART_ANIMATION } from "@/lib/motion";

interface MetricTrendChartProps<T extends { epoch: number }> {
  title: string;
  /** Tiap titik wajib punya `epoch` (detik) + key tiap seri. */
  data: T[];
  series: Array<{ key: Extract<keyof T, string>; name: string; color: string }>;
  /** Satuan untuk tooltip & sumbu Y, mis. "W", "%", "°C". */
  unit: string;
  /** Desimal angka pada tooltip. Default 0. */
  decimals?: number;
  refLine?: { y: number; label: string };
  /** Tinggi area chart dalam px. Default 256. */
  height?: number;
}

function TrendTooltip({
  active,
  payload,
  label,
  unit,
  decimals,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
  unit: string;
  decimals: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-card p-3 text-xs shadow-lg">
      <p className="mb-1 font-medium text-muted-foreground metric">
        {label ? formatTime(label) : ""}
      </p>
      {payload.map((p) => (
        <p key={p.name} className="metric" style={{ color: p.color }}>
          {p.name}: {formatNumber(p.value, decimals)} {unit}
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
const legendFormatter = (value: string) => (
  <span style={{ fontSize: 12, color: UI_COLORS.axis }}>{value}</span>
);

export function MetricTrendChart<T extends { epoch: number }>({
  title,
  data,
  series,
  unit,
  decimals = 0,
  refLine,
  height = 256,
}: MetricTrendChartProps<T>) {
  const isArea = series.length === 1;
  const animate = useChartAnimation();
  const gradId = `area-${useId().replace(/:/g, "")}`;

  const sharedAxes = (
    <>
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
        tickFormatter={(v: number) => `${formatNumber(v, 0)}${unit}`}
        tick={axisTick}
        tickLine={false}
        axisLine={false}
        width={56}
      />
      <Tooltip content={<TrendTooltip unit={unit} decimals={decimals} />} />
      <Legend formatter={legendFormatter} />
      {refLine && (
        <ReferenceLine
          y={refLine.y}
          stroke={UI_COLORS.danger}
          strokeDasharray="4 4"
          label={{ value: refLine.label, fill: UI_COLORS.danger, fontSize: 11 }}
        />
      )}
    </>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {isArea ? (
              <AreaChart
                data={data}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                {/* Gradient satu warna memudar ke transparan (id unik per instance) */}
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={series[0].color}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={series[0].color}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                {sharedAxes}
                <Area
                  type="monotone"
                  dataKey={series[0].key}
                  name={series[0].name}
                  stroke={series[0].color}
                  strokeWidth={2}
                  fill={`url(#${gradId})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={animate}
                  animationDuration={CHART_ANIMATION.duration}
                  animationEasing={CHART_ANIMATION.easing}
                />
              </AreaChart>
            ) : (
              <LineChart
                data={data}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                {sharedAxes}
                {series.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={animate}
                    animationDuration={CHART_ANIMATION.duration}
                    animationEasing={CHART_ANIMATION.easing}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
