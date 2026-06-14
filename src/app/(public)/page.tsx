import { LiveDashboard } from "@/components/dashboard/LiveDashboard";
import { mockLiveData, mockHistory } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Dashboard Sistem
      </h1>
      {/*
        LiveDashboard is a client component:
        - Subscribes to /live via onValue (Firebase RTDB) once mounted
        - Falls back to mock initial data during SSR and before Firebase connects
        - Shows offline banner if ts is stale >30s
      */}
      <LiveDashboard initialLive={mockLiveData} initialHistory={mockHistory} />
    </div>
  );
}
