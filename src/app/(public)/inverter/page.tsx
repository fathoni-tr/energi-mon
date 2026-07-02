"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { MetricTrendChart } from "@/components/charts/MetricTrendChart";
import { mockLiveData, mockHistory } from "@/lib/mock-data";
import { CHART_COLORS } from "@/lib/colors";
import {
  peak,
  average,
  energyKwh,
  dailyEnergy,
  todayPoints,
} from "@/lib/analytics";
import { useLiveData } from "@/lib/firebase/hooks/useLiveData";
import { useHistory } from "@/lib/firebase/hooks/useHistory";

const COLOR = CHART_COLORS.load;

export default function InverterPage() {
  const liveState = useLiveData();
  const historyState = useHistory();
  const live = (liveState.data ?? mockLiveData).load;
  const history =
    historyState.data.length > 0 ? historyState.data : mockHistory;
  const today = todayPoints(history);
  const energy = dailyEnergy(history);

  const compareData = history.map((h) => ({
    epoch: h.epoch,
    load_p: h.load_p,
    gen: h.plts_p + h.pltb_p,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Output Inverter
      </h1>

      {/* Pembacaan langsung */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Daya"
          value={live.p}
          unit="W"
          decimals={0}
          icon="zap"
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
      </div>

      {/* KPI turunan 24 jam */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Output Puncak"
          value={peak(history, "load_p")}
          unit="W"
          decimals={0}
          sparkColor={COLOR}
        />
        <StatCard
          label="Output Rata-rata"
          value={average(history, "load_p")}
          unit="W"
          decimals={0}
          sparkColor={COLOR}
        />
        <StatCard
          label="Energi Hari Ini"
          value={energyKwh(today, "load_p")}
          unit="kWh"
          decimals={1}
          sparkColor={COLOR}
        />
        <StatCard
          label="Tercukupi Pembangkitan"
          value={energy.selfSufficiency}
          unit="%"
          decimals={0}
          sparkColor={COLOR}
        />
      </div>

      {/* Grafik 24 jam */}
      <MetricTrendChart
        title="Output Inverter 24 Jam"
        data={history}
        series={[{ key: "load_p", name: "Output Inverter", color: COLOR }]}
        unit="W"
        height={288}
      />

      <MetricTrendChart
        title="Output Inverter vs Pembangkitan 24 Jam"
        data={compareData}
        series={[
          { key: "load_p", name: "Output Inverter", color: CHART_COLORS.load },
          { key: "gen", name: "Pembangkitan", color: CHART_COLORS.batt },
        ]}
        unit="W"
      />
    </div>
  );
}
