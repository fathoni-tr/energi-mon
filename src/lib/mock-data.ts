import type {
  LiveData,
  HistoryPoint,
  ContactPerson,
  AlarmThreshold,
  SiteConfig,
  IssueReport,
} from "./types";

// Dibulatkan ke bucket 5 menit supaya server & client menghasilkan
// timestamp (dan data) yang identik — mencegah hydration mismatch.
const NOW = Math.floor(Date.now() / 1000 / 300) * 300;

/**
 * PRNG seeded (mulberry32): urutan "acak" yang deterministik —
 * server dan client menghasilkan deret yang sama persis.
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const mockLiveData: LiveData = {
  ts: NOW,
  plts: { v: 48.2, i: 18.5, p: 892, irr: 756, temp: 42 },
  pltb: { v: 24.1, i: 8.3, p: 200, wind: 6.4, rpm: 320 },
  batt: { v: 51.6, i: 12.4, p_in: 640, p_out: 0, soc: 78 },
  load: { v: 220, i: 4.1, p: 902 },
  sys: { mode: "auto", status: "normal" },
};

function generateHistory(): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const start = NOW - 24 * 3600;
  const interval = 5 * 60;
  const rand = mulberry32(0x1ec0);

  for (let t = start; t <= NOW; t += interval) {
    // Jam dihitung dengan offset tetap UTC+8 (WITA) — getHours() memakai
    // timezone lokal mesin sehingga hasil server vs client bisa berbeda.
    const hour = Math.floor((t + 8 * 3600) / 3600) % 24;
    const solarFactor =
      hour >= 6 && hour <= 18
        ? Math.sin(((hour - 6) / 12) * Math.PI) * (0.8 + rand() * 0.2)
        : 0;
    const windFactor = 0.3 + rand() * 0.4;
    const loadFactor =
      hour >= 18 || hour < 6 ? 0.8 + rand() * 0.2 : 0.4 + rand() * 0.3;

    const plts_p = Math.round(solarFactor * 1200 + rand() * 50);
    const pltb_p = Math.round(windFactor * 300 + rand() * 30);
    const load_p = Math.round(loadFactor * 900 + rand() * 100);

    // Seri detail per-sumber (konsisten dengan daya yang dihasilkan).
    const plts_irr = Math.round(solarFactor * 1000 + rand() * 30);
    const plts_temp =
      Math.round((28 + solarFactor * 22 + rand() * 3) * 10) / 10;
    const pltb_wind = Math.round((windFactor * 12 + rand()) * 10) / 10;
    const pltb_rpm = Math.round((pltb_p / 300) * 560 + rand() * 20);

    const net = plts_p + pltb_p - load_p;
    const batt_p = -net;
    const prevSoc = points.length > 0 ? points[points.length - 1].batt_soc : 78;
    const batt_soc = Math.min(
      100,
      Math.max(10, prevSoc - (batt_p / 10000) * interval),
    );
    const batt_v = Math.round((48 + (batt_soc / 100) * 6) * 10) / 10;
    const batt_i = Math.round((batt_p / batt_v) * 10) / 10;

    points.push({
      epoch: t,
      plts_p,
      plts_irr,
      plts_temp,
      pltb_p,
      pltb_wind,
      pltb_rpm,
      batt_p,
      batt_soc,
      batt_v,
      batt_i,
      load_p,
    });
  }
  return points;
}

export const mockHistory: HistoryPoint[] = generateHistory();

export const mockSiteConfig: SiteConfig = {
  plantName: "PLMH Sabu Raijua",
  timezone: "Asia/Makassar",
  liveIntervalSeconds: 5,
  historyIntervalSeconds: 60,
};

export const mockContacts: ContactPerson[] = [
  {
    id: "1",
    name: "Budi Santoso",
    role: "Teknisi Lapangan",
    phone: "6281234567890",
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "2",
    name: "Siti Rahma",
    role: "Supervisor Operasi",
    phone: "6289876543210",
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "3",
    name: "Ahmad Fauzi",
    role: "Manajer Plant",
    phone: "6285551234567",
    isActive: false,
    sortOrder: 3,
  },
];

export const mockThresholds: AlarmThreshold[] = [
  { id: "1", metric: "soc_min", value: 20, unit: "%", enabled: true },
  { id: "2", metric: "panel_temp_max", value: 65, unit: "degC", enabled: true },
  { id: "3", metric: "load_p_max", value: 1500, unit: "W", enabled: true },
  { id: "4", metric: "wind_max", value: 15, unit: "m/s", enabled: false },
];

export const mockReports: IssueReport[] = [
  {
    id: "1",
    reporterName: "Andi",
    reporterContact: "081234567",
    category: "data_not_updating",
    description:
      "Data panel surya tidak update sejak pagi tadi, sudah lebih dari 2 jam.",
    status: "open",
    adminNote: null,
    routedTo: "1",
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    resolvedAt: null,
  },
  {
    id: "2",
    reporterName: null,
    reporterContact: null,
    category: "sensor_anomaly",
    description: "Nilai arus baterai menunjukkan -999 yang tidak wajar.",
    status: "in_progress",
    adminNote: "Sedang dicek oleh teknisi lapangan.",
    routedTo: "1",
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    resolvedAt: null,
  },
  {
    id: "3",
    reporterName: "Dewi",
    reporterContact: "0821000111",
    category: "display_issue",
    description: "Grafik SOC tidak tampil di halaman baterai.",
    status: "resolved",
    adminNote: "Sudah diperbaiki, cache browser perlu di-clear.",
    routedTo: null,
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
  },
];

export const CATEGORY_LABELS: Record<IssueReport["category"], string> = {
  data_not_updating: "Data tidak update",
  sensor_anomaly: "Nilai sensor tidak wajar",
  display_issue: "Tampilan bermasalah",
  other: "Lainnya",
};
