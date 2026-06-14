import { z } from "zod";

export const FirebaseConfigSchema = z.object({
  apiKey: z.string().min(1, "apiKey wajib diisi"),
  authDomain: z.string().min(1, "authDomain wajib diisi"),
  databaseURL: z.string().url("databaseURL harus berupa URL valid"),
  projectId: z.string().min(1, "projectId wajib diisi"),
  storageBucket: z.string().min(1, "storageBucket wajib diisi"),
  appId: z.string().min(1, "appId wajib diisi"),
});

export type FirebaseConfigInput = z.infer<typeof FirebaseConfigSchema>;
