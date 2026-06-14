import { StatCard } from "@/components/dashboard/StatCard";
import { MetricTrendChart } from "@/components/charts/MetricTrendChart";
import { mockLiveData, mockHistory, mockThresholds } from "@/lib/mock-data";
import { CHART_COLORS } from "@/lib/colors";
import {
  peak,
  average,
  energyKwh,
  capacityFactor,
  todayPoints,
} from "@/lib/analytics";

const COLOR = CHART_COLORS.plts;
const RATED_W = 1500;

export default function PltsPage() {
  const live = mockLiveData.plts;
  const history = mockHistory;
  const today = todayPoints(history);
  const tempMax =
    mockThresholds.find((t) => t.metric === "panel_temp_max")?.value ?? 65;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        PLTS — Panel Surya
      </h1>

      {/* Pembacaan langsung */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Daya"
          value={live.p}
          unit="W"
          decimals={0}
          icon="sun"
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
          label="Irradiance"
          value={live.irr}
          unit="W/m²"
          decimals={0}
          sparkColor={COLOR}
        />
        <StatCard
          label="Suhu Panel"
          value={live.temp}
          unit="°C"
          decimals={1}
          sparkColor={COLOR}
          alert={live.temp > tempMax}
        />
      </div>

      {/* KPI turunan 24 jam */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Daya Puncak"
          value={peak(history, "plts_p")}
          unit="W"
          decimals={0}
          sparkColor={COLOR}
        />
        <StatCard
          label="Daya Rata-rata"
          value={average(history, "plts_p")}
          unit="W"
          decimals={0}
          sparkColor={COLOR}
        />
        <StatCard
          label="Energi Hari Ini"
          value={energyKwh(today, "plts_p")}
          unit="kWh"
          decimals={1}
          sparkColor={COLOR}
        />
        <StatCard
          label="Capacity Factor"
          value={capacityFactor(history, "plts_p", RATED_W)}
          unit="%"
          decimals={0}
          sparkColor={COLOR}
        />
      </div>

      {/* Grafik 24 jam */}
      <MetricTrendChart
        title="Daya PLTS 24 Jam"
        data={history}
        series={[{ key: "plts_p", name: "Daya PLTS", color: COLOR }]}
        unit="W"
        height={288}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MetricTrendChart
          title="Irradiance 24 Jam"
          data={history}
          series={[{ key: "plts_irr", name: "Irradiance", color: COLOR }]}
          unit="W/m²"
        />
        <MetricTrendChart
          title="Suhu Panel 24 Jam"
          data={history}
          series={[{ key: "plts_temp", name: "Suhu Panel", color: COLOR }]}
          unit="°C"
          decimals={1}
          refLine={{ y: tempMax, label: `Maks ${tempMax}°C` }}
        />
      </div>
    </div>
  );
}
