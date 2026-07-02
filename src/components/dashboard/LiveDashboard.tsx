"use client";

import { StatCard } from "@/components/dashboard/StatCard";
import { PowerFlowPanel } from "@/components/dashboard/PowerFlowPanel";
import { BatteryPanel } from "@/components/dashboard/BatteryPanel";
import { SystemSummary } from "@/components/dashboard/SystemSummary";
import { EnergyBalanceCard } from "@/components/dashboard/EnergyBalanceCard";
import { TrendDayaChart } from "@/components/charts/TrendDayaChart";
import { EnergiDonutChart } from "@/components/charts/EnergiDonutChart";
import { useLiveData } from "@/lib/firebase/hooks/useLiveData";
import { useHistory } from "@/lib/firebase/hooks/useHistory";
import { dailyEnergy } from "@/lib/analytics";
import { CHART_COLORS } from "@/lib/colors";
import type { LiveData, HistoryPoint } from "@/lib/types";

function buildSpark(values: number[]) {
  return values.slice(-20).map((v) => ({ v }));
}

interface LiveDashboardProps {
  /** Data awal dari server (mock atau cache) untuk render tanpa flicker */
  initialLive: LiveData;
  initialHistory: HistoryPoint[];
}

export function LiveDashboard({
  initialLive,
  initialHistory,
}: LiveDashboardProps) {
  const liveState = useLiveData();
  const historyState = useHistory();

  const live = liveState.data ?? initialLive;
  const history =
    historyState.data.length > 0 ? historyState.data : initialHistory;
  const offline = liveState.offline;

  const genSpark = buildSpark(history.map((h) => h.plts_p + h.pltb_p));
  const loadSpark = buildSpark(history.map((h) => h.load_p));
  const socSpark = buildSpark(history.map((h) => h.batt_soc));
  const energy = dailyEnergy(history);
  const totalGen = live.plts.p + live.pltb.p;

  return (
    <div className="space-y-6">
      {/* Status bar — tampil hanya saat offline atau error */}
      {(offline || liveState.error) && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {liveState.error
            ? `Gagal terhubung: ${liveState.error}`
            : "Perangkat offline — menampilkan data terakhir yang tersedia."}
        </div>
      )}

      {/* KPI inti */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Pembangkitan"
          value={totalGen}
          unit="W"
          decimals={0}
          icon="plugZap"
          spark={genSpark}
          sparkColor={CHART_COLORS.batt}
        />
        <StatCard
          label="Output Inverter"
          value={live.load.p}
          unit="W"
          decimals={0}
          icon="zap"
          spark={loadSpark}
          sparkColor={CHART_COLORS.load}
        />
        <StatCard
          label="SOC Baterai"
          value={live.batt.soc}
          unit="%"
          decimals={0}
          icon="batteryCharging"
          spark={socSpark}
          sparkColor={CHART_COLORS.batt}
          alert={live.batt.soc < 20}
        />
        <StatCard
          label="Kemandirian Hari Ini"
          value={energy.selfSufficiency}
          unit="%"
          decimals={0}
          icon="gauge"
          sparkColor={CHART_COLORS.batt}
        />
      </div>

      {/* Aliran daya + ringkasan baterai */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PowerFlowPanel data={live} />
        <BatteryPanel data={live.batt} />
      </div>

      {/* Tren gabungan 24 jam */}
      <TrendDayaChart data={history} />

      {/* Infografis turunan + kontribusi + ringkasan */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <EnergyBalanceCard data={history} />
        <EnergiDonutChart pltsKwh={energy.pltsKwh} pltbKwh={energy.pltbKwh} />
        <SystemSummary data={live} />
      </div>
    </div>
  );
}
