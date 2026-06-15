"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { MetricTrendChart } from "@/components/charts/MetricTrendChart";
import { mockLiveData, mockHistory } from "@/lib/mock-data";
import { CHART_COLORS } from "@/lib/colors";
import {
  peak,
  average,
  energyKwh,
  capacityFactor,
  todayPoints,
} from "@/lib/analytics";
import { useLiveData } from "@/lib/firebase/hooks/useLiveData";
import { useHistory } from "@/lib/firebase/hooks/useHistory";

const COLOR = CHART_COLORS.pltb;
const RATED_W = 350;

export default function PltbPage() {
  const liveState = useLiveData();
  const historyState = useHistory();
  const live = (liveState.data ?? mockLiveData).pltb;
  const history =
    historyState.data.length > 0 ? historyState.data : mockHistory;
  const today = todayPoints(history);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        PLTB — Turbin Angin
      </h1>

      {/* Pembacaan langsung */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Daya"
          value={live.p}
          unit="W"
          decimals={0}
          icon="wind"
          sparkColor={COLOR}
        />
        <StatCard
          label="Tegangan"
          value={live.v}
          unit="V"
          decimals={1}
          sparkColor={COLOR}
        />
        <StatCard
          label="Arus"
          value={live.i}
          unit="A"
          decimals={1}
          sparkColor={COLOR}
        />
        <StatCard
          label="Kec. Angin"
          value={live.wind}
          unit="m/s"
          decimals={1}
          sparkColor={COLOR}
        />
        <StatCard
          label="RPM"
          value={live.rpm}
          unit="RPM"
          decimals={0}
          sparkColor={COLOR}
        />
      </div>

      {/* KPI turunan 24 jam */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Daya Puncak"
          value={peak(history, "pltb_p")}
          unit="W"
          decimals={0}
          sparkColor={COLOR}
        />
        <StatCard
          label="Daya Rata-rata"
          value={average(history, "pltb_p")}
          unit="W"
          decimals={0}
          sparkColor={COLOR}
        />
        <StatCard
          label="Energi Hari Ini"
          value={energyKwh(today, "pltb_p")}
          unit="kWh"
          decimals={1}
          sparkColor={COLOR}
        />
        <StatCard
          label="Capacity Factor"
          value={capacityFactor(history, "pltb_p", RATED_W)}
          unit="%"
          decimals={0}
          sparkColor={COLOR}
        />
      </div>

      {/* Grafik 24 jam */}
      <MetricTrendChart
        title="Daya PLTB 24 Jam"
        data={history}
        series={[{ key: "pltb_p", name: "Daya PLTB", color: COLOR }]}
        unit="W"
        height={288}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MetricTrendChart
          title="Kecepatan Angin 24 Jam"
          data={history}
          series={[{ key: "pltb_wind", name: "Kec. Angin", color: COLOR }]}
          unit="m/s"
          decimals={1}
        />
        <MetricTrendChart
          title="RPM Turbin 24 Jam"
          data={history}
          series={[{ key: "pltb_rpm", name: "RPM", color: COLOR }]}
          unit="RPM"
        />
      </div>
    </div>
  );
}
