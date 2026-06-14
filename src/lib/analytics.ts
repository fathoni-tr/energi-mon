import type { HistoryPoint } from "./types";

/** Field deret-waktu numerik pada HistoryPoint (selain epoch). */
export type SeriesKey = Exclude<keyof HistoryPoint, "epoch">;

const INTERVAL_HOURS = 5 / 60; // 1 titik = 5 menit

/**
 * Titik history yang jatuh pada tanggal hari ini (zona waktu lokal browser).
 * Menggantikan filter inline yang sebelumnya ada di dashboard page.
 */
/** Indeks hari dengan offset tetap UTC+8 (WITA) — konsisten server/client. */
function dayIndex(epoch: number): number {
  return Math.floor((epoch + 8 * 3600) / 86400);
}

export function todayPoints(history: HistoryPoint[]): HistoryPoint[] {
  const today = dayIndex(Date.now() / 1000);
  return history.filter((h) => dayIndex(h.epoch) === today);
}

/** Nilai puncak sebuah seri. */
export function peak(history: HistoryPoint[], key: SeriesKey): number {
  if (history.length === 0) return 0;
  return history.reduce((m, h) => Math.max(m, h[key]), -Infinity);
}

/** Nilai minimum sebuah seri. */
export function low(history: HistoryPoint[], key: SeriesKey): number {
  if (history.length === 0) return 0;
  return history.reduce((m, h) => Math.min(m, h[key]), Infinity);
}

/** Rata-rata sebuah seri. */
export function average(history: HistoryPoint[], key: SeriesKey): number {
  if (history.length === 0) return 0;
  return history.reduce((s, h) => s + h[key], 0) / history.length;
}

/**
 * Energi (kWh) dari seri daya (W) selama rentang history.
 * Hanya menjumlahkan nilai positif (daya yang benar-benar dihasilkan/dipakai).
 */
export function energyKwh(history: HistoryPoint[], key: SeriesKey): number {
  return history.reduce(
    (s, h) => s + (Math.max(0, h[key]) * INTERVAL_HOURS) / 1000,
    0,
  );
}

/**
 * Capacity factor (%) = energi aktual / energi maksimum teoretis pada daya rated.
 */
export function capacityFactor(
  history: HistoryPoint[],
  key: SeriesKey,
  ratedW: number,
): number {
  if (history.length === 0 || ratedW <= 0) return 0;
  const hours = history.length * INTERVAL_HOURS;
  const maxKwh = (ratedW * hours) / 1000;
  if (maxKwh <= 0) return 0;
  return (energyKwh(history, key) / maxKwh) * 100;
}

export interface BatteryEnergy {
  chargeKwh: number;
  dischargeKwh: number;
}

/**
 * Energi pengisian dan pengosongan baterai untuk rentang history.
 * Konvensi: `batt_p < 0` = pengisian, `batt_p > 0` = pengosongan.
 */
export function batteryEnergy(history: HistoryPoint[]): BatteryEnergy {
  return history.reduce(
    (acc, h) => ({
      chargeKwh:
        acc.chargeKwh + (Math.max(0, -h.batt_p) * INTERVAL_HOURS) / 1000,
      dischargeKwh:
        acc.dischargeKwh + (Math.max(0, h.batt_p) * INTERVAL_HOURS) / 1000,
    }),
    { chargeKwh: 0, dischargeKwh: 0 },
  );
}

export interface DailyEnergy {
  pltsKwh: number;
  pltbKwh: number;
  genKwh: number;
  loadKwh: number;
  surplusKwh: number;
  /** Rasio pembangkitan terhadap konsumsi (%). */
  selfSufficiency: number;
}

/** Ringkasan neraca energi untuk titik history hari ini. */
export function dailyEnergy(history: HistoryPoint[]): DailyEnergy {
  const today = todayPoints(history);
  const pltsKwh = energyKwh(today, "plts_p");
  const pltbKwh = energyKwh(today, "pltb_p");
  const genKwh = pltsKwh + pltbKwh;
  const loadKwh = energyKwh(today, "load_p");
  const surplusKwh = genKwh - loadKwh;
  // Kemandirian dibatasi 100% — kelebihan pembangkitan terbaca sebagai surplus.
  const selfSufficiency =
    loadKwh > 0 ? Math.min(100, (genKwh / loadKwh) * 100) : 0;
  return { pltsKwh, pltbKwh, genKwh, loadKwh, surplusKwh, selfSufficiency };
}
