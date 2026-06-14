import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatWatt } from "@/lib/utils";
import { CHART_COLORS } from "@/lib/colors";
import type { LiveData } from "@/lib/types";

interface SystemSummaryProps {
  data: LiveData | null;
}

export function SystemSummary({ data }: SystemSummaryProps) {
  if (!data) return null;

  // Total pembangkitan & beban TIDAK diulang di sini — sudah jadi KPI utama.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan Sistem</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-0">
        <div>
          <p className="text-xs text-muted-foreground">PLTS</p>
          <p
            className="metric text-sm font-semibold"
            style={{ color: CHART_COLORS.plts }}
          >
            {formatWatt(data.plts.p)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">PLTB</p>
          <p
            className="metric text-sm font-semibold"
            style={{ color: CHART_COLORS.pltb }}
          >
            {formatWatt(data.pltb.p)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Irradiance</p>
          <p className="metric text-sm font-semibold">
            {formatNumber(data.plts.irr, 0)} W/m²
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Kec. Angin</p>
          <p className="metric text-sm font-semibold">
            {formatNumber(data.pltb.wind, 1)} m/s
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Mode</p>
          <Badge variant="outline" className="capitalize text-xs">
            {data.sys.mode}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge
            variant={
              data.sys.status === "normal"
                ? "default"
                : data.sys.status === "warning"
                  ? "warning"
                  : "destructive"
            }
            className="capitalize text-xs"
          >
            {data.sys.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
