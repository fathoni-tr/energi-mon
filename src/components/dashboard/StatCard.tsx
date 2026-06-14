"use client";

import { useId } from "react";
import {
  Sun,
  Wind,
  Battery,
  BatteryCharging,
  Zap,
  PlugZap,
  Gauge,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";
import { CHART_COLORS, withAlpha } from "@/lib/colors";
import { useChartAnimation, CHART_ANIMATION } from "@/lib/motion";
import { useCountUp } from "@/lib/hooks/use-count-up";

interface SparkPoint {
  v: number;
}

/**
 * Ikon dirujuk via nama (string), bukan komponen — halaman server component
 * tidak boleh mengirim function/forwardRef sebagai prop ke client component.
 */
const ICONS = {
  sun: Sun,
  wind: Wind,
  battery: Battery,
  batteryCharging: BatteryCharging,
  zap: Zap,
  plugZap: PlugZap,
  gauge: Gauge,
} as const;

export type StatIcon = keyof typeof ICONS;

interface StatCardProps {
  label: string;
  value: number | null;
  unit: string;
  decimals?: number;
  icon?: StatIcon;
  spark?: SparkPoint[];
  sparkColor?: string;
  alert?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  unit,
  decimals = 1,
  icon,
  spark,
  sparkColor = CHART_COLORS.batt,
  alert = false,
  className,
}: StatCardProps) {
  const animate = useChartAnimation();
  const display = useCountUp(value);
  const gradId = `spark-${useId().replace(/:/g, "")}`;
  const hasSpark = !!spark && spark.length > 0;
  const Icon = icon ? ICONS[icon] : null;

  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        alert && "border-destructive",
        className,
      )}
    >
      <CardContent className={cn("p-5", hasSpark && "pb-12")}>
        <div className="mb-1 flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-1">
            {label}
          </p>
          {Icon && (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
              style={{
                color: alert ? "rgb(var(--destructive))" : sparkColor,
                backgroundColor: alert
                  ? "rgb(var(--destructive) / 0.12)"
                  : withAlpha(sparkColor, 0.12),
              }}
            >
              <Icon className="h-5 w-5" />
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5">
          {display !== null ? (
            <span
              className={cn(
                "text-2xl sm:text-3xl xl:text-4xl font-bold metric leading-none",
                alert ? "text-destructive" : "text-foreground",
              )}
            >
              {formatNumber(display, decimals)}
            </span>
          ) : (
            <span className="text-2xl sm:text-3xl font-bold text-muted-foreground">
              —
            </span>
          )}
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>

        {hasSpark && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 opacity-90">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={spark}
                margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={sparkColor}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor={sparkColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  fill={`url(#${gradId})`}
                  dot={false}
                  isAnimationActive={animate}
                  animationDuration={CHART_ANIMATION.duration}
                  animationEasing={CHART_ANIMATION.easing}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
