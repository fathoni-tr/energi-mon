import { z } from "zod";

export const IssueReportSchema = z.object({
  reporterName: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  reporterContact: z
    .string()
    .max(100)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  category: z.enum([
    "data_not_updating",
    "sensor_anomaly",
    "display_issue",
    "other",
  ]),
  description: z
    .string()
    .min(10, "Deskripsi minimal 10 karakter")
    .max(2000, "Deskripsi maksimal 2000 karakter"),
});

export type IssueReportInput = z.infer<typeof IssueReportSchema>;

export const ReportStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"]),
  adminNote: z.string().max(500).nullable().optional(),
  routedTo: z.string().max(100).nullable().optional(),
});

export type ReportStatusInput = z.infer<typeof ReportStatusSchema>;
