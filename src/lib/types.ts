export interface PltsData {
  v: number;
  i: number;
  p: number;
  irr: number;
  temp: number;
}

export interface PltbData {
  v: number;
  i: number;
  p: number;
  wind: number;
  rpm: number;
}

export interface BattData {
  v: number;
  i: number;
  p_in: number;
  p_out: number;
  soc: number;
}

export interface LoadData {
  v: number;
  i: number;
  p: number;
}

export interface SysData {
  mode: "auto" | "manual";
  status: "normal" | "warning" | "fault";
}

export interface LiveData {
  ts: number;
  plts: PltsData;
  pltb: PltbData;
  batt: BattData;
  load: LoadData;
  sys: SysData;
}

export interface HistoryPoint {
  epoch: number;
  plts_p: number;
  plts_irr: number;
  plts_temp: number;
  pltb_p: number;
  pltb_wind: number;
  pltb_rpm: number;
  batt_p: number;
  batt_soc: number;
  batt_v: number;
  batt_i: number;
  load_p: number;
}

export interface ContactPerson {
  id: string;
  name: string;
  role: string;
  phone: string;
  isActive: boolean;
  sortOrder: number;
}

export interface AlarmThreshold {
  id: string;
  metric: "soc_min" | "panel_temp_max" | "load_p_max" | "wind_max";
  value: number;
  unit: string;
  enabled: boolean;
}

export interface SiteConfig {
  plantName: string;
  timezone: string;
  liveIntervalSeconds: number;
  historyIntervalSeconds: number;
}

export interface IssueReport {
  id: string;
  reporterName: string | null;
  reporterContact: string | null;
  category: "data_not_updating" | "sensor_anomaly" | "display_issue" | "other";
  description: string;
  status: "open" | "in_progress" | "resolved";
  adminNote: string | null;
  routedTo: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  appId: string;
}
