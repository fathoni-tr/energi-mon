"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { BatteryPanel } from "@/components/dashboard/BatteryPanel";
import { MetricTrendChart } from "@/components/charts/MetricTrendChart";
import { mockLiveData, mockHistory, mockThresholds } from "@/lib/mock-data";
import { CHART_COLORS } from "@/lib/colors";
import { peak, low, todayPoints, batteryEnergy } from "@/lib/analytics";
import { useLiveData } from "@/lib/firebase/hooks/useLiveData";
import { useHistory } from "@/lib/firebase/hooks/useHistory";

const COLOR = CHART_COLORS.batt;

export default function BateraiPage() {
  const liveState = useLiveData();
  const historyState = useHistory();
  const live = (liveState.data ?? mockLiveData).batt;
  const history =
    historyState.data.length > 0 ? historyState.data : mockHistory;
  const today = todayPoints(history);
  const socMin =
    mockThresholds.find((t) => t.metric === "soc_min")?.value ?? 20;

  // Konvensi: batt_p > 0 = pengisian (charge), batt_p < 0 = pengosongan (discharge).
  const { chargeKwh, dischargeKwh } = batteryEnergy(today);
  const powerData = history.map((h) => ({
    epoch: h.epoch,
    charge: Math.max(0, h.batt_p),
    discharge: Math.max(0, -h.batt_p),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Baterai (BESS)
      </h1>

      {/* Pembacaan langsung */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="SOC"
          value={live.soc}
          unit="%"
          decimals={0}
          icon="battery"
          sparkColor={COLOR}
          alert={live.soc < socMin}
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
          label="Daya Masuk"
          value={live.p_in}
          unit="W"
          decimals={0}
          sparkColor={COLOR}
        />
        <StatCard
          label="Daya Keluar"
          value={live.p_out}
          unit="W"
          decimals={0}
          sparkColor={COLOR}
        />
      </div>

      {/* KPI turunan 24 jam */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Energi Masuk"
          value={chargeKwh}
          unit="kWh"
          decimals={1}
          sparkColor={COLOR}
        />
        <StatCard
          label="Energi Keluar"
          value={dischargeKwh}
          unit="kWh"
          decimals={1}
          sparkColor={COLOR}
        />
        <StatCard
          label="SOC Min"
          value={low(history, "batt_soc")}
          unit="%"
          decimals={0}
          sparkColor={COLOR}
        />
        <StatCard
          label="SOC Maks"
          value={peak(history, "batt_soc")}
          unit="%"
          decimals={0}
          sparkColor={COLOR}
        />
      </div>

      {/* SOC + ringkasan baterai */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MetricTrendChart
          title="SOC Baterai 24 Jam"
          data={history}
          series={[{ key: "batt_soc", name: "SOC", color: COLOR }]}
          unit="%"
          decimals={1}
          refLine={{ y: socMin, label: `Min ${socMin}%` }}
        />
        <BatteryPanel data={live} />
      </div>

      {/* Tegangan + arus */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MetricTrendChart
          title="Tegangan Baterai 24 Jam"
          data={history}
          series={[{ key: "batt_v", name: "Tegangan", color: COLOR }]}
          unit="V"
          decimals={1}
        />
        <MetricTrendChart
          title="Arus Baterai 24 Jam"
          data={history}
          series={[{ key: "batt_i", name: "Arus", color: COLOR }]}
          unit="A"
          decimals={1}
        />
      </div>

      {/* Daya masuk vs keluar — pengosongan ungu (operasi normal, bukan bahaya) */}
      <MetricTrendChart
        title="Daya Pengisian vs Pengosongan 24 Jam"
        data={powerData}
        series={[
          { key: "charge", name: "Pengisian", color: CHART_COLORS.batt },
          { key: "discharge", name: "Pengosongan", color: CHART_COLORS.load },
        ]}
        unit="W"
      />
    </div>
  );
}
