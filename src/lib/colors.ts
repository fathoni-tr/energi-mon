/**
 * Satu sumber warna untuk Recharts & inline style.
 *
 * Nilai berbentuk "rgb(var(--token))" sehingga otomatis mengikuti tema
 * gelap/terang (token didefinisikan sebagai triplet RGB di globals.css).
 * Untuk transparansi gunakan `withAlpha` — JANGAN konkatenasi hex
 * (mis. color + "40") karena nilai bukan hex.
 */

export type ChartToken = "plts" | "pltb" | "batt" | "load";

export const CHART_COLORS: Record<ChartToken, string> = {
  plts: "rgb(var(--chart-plts))",
  pltb: "rgb(var(--chart-pltb))",
  batt: "rgb(var(--chart-batt))",
  load: "rgb(var(--chart-load))",
};

export const UI_COLORS = {
  grid: "rgb(var(--border))",
  axis: "rgb(var(--muted-foreground))",
  danger: "rgb(var(--destructive))",
  warning: "rgb(var(--warning))",
};

/**
 * Tambahkan alpha ke warna token: "rgb(var(--x))" -> "rgb(var(--x) / a)".
 */
export function withAlpha(color: string, alpha: number): string {
  return color.replace(/\)\s*$/, ` / ${alpha})`);
}
