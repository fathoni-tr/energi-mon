import { z } from "zod";

// ── Sub-schemas per subsistem ──────────────────────────────────────────────

const PltsSchema = z.object({
  v: z.number(),
  i: z.number(),
  p: z.number(),
  irr: z.number(),
  temp: z.number(),
});

const PltbSchema = z.object({
  v: z.number(),
  i: z.number(),
  p: z.number(),
  wind: z.number(),
  rpm: z.number(),
});

const BattSchema = z.object({
  v: z.number(),
  i: z.number(),
  p_in: z.number(),
  p_out: z.number(),
  soc: z.number().min(0).max(100),
});

const LoadSchema = z.object({
  v: z.number(),
  i: z.number(),
  p: z.number(),
});

const SysSchema = z.object({
  mode: z.enum(["auto", "manual"]),
  status: z.enum(["normal", "warning", "fault"]),
});

// ── Payload lengkap /live ──────────────────────────────────────────────────

export const LivePayloadSchema = z.object({
  ts: z.number().int().positive(),
  plts: PltsSchema,
  pltb: PltbSchema,
  batt: BattSchema,
  load: LoadSchema,
  sys: SysSchema,
});

export type LivePayload = z.infer<typeof LivePayloadSchema>;

// ── Satu titik history /history/{date}/{epoch} ─────────────────────────────

export const HistoryPointSchema = z.object({
  epoch: z.number().int().positive(),
  plts_p: z.number(),
  plts_irr: z.number(),
  plts_temp: z.number(),
  pltb_p: z.number(),
  pltb_wind: z.number(),
  pltb_rpm: z.number(),
  batt_p: z.number(),
  batt_soc: z.number().min(0).max(100),
  batt_v: z.number(),
  batt_i: z.number(),
  load_p: z.number(),
});

export type HistoryPointPayload = z.infer<typeof HistoryPointSchema>;
