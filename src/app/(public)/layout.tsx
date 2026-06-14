import { Header } from "@/components/layout/Header";
import { ReportIssueModal } from "@/components/layout/ReportIssueModal";
import { mockSiteConfig, mockLiveData } from "@/lib/mock-data";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header plantName={mockSiteConfig.plantName} lastTs={mockLiveData.ts} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-4 px-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {mockSiteConfig.plantName} &copy; {new Date().getFullYear()}
          </p>
          <ReportIssueModal />
        </div>
      </footer>
    </div>
  );
}
