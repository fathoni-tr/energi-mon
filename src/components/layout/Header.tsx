"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarDrawer } from "./SidebarDrawer";
import { formatDateTime } from "@/lib/utils";

interface HeaderProps {
  plantName?: string;
  lastTs?: number;
  /**
   * Mode mock (frontend-only): badge selalu Online setelah mount.
   * TODO (fase backend): ganti dengan polling isOffline(lastTs) dari
   * listener RTDB sehingga status mencerminkan telemetri nyata.
   */
  mock?: boolean;
}

export function Header({
  plantName = "PLMH Sabu Raijua",
  lastTs,
  mock = true,
}: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const online = mock ? mounted : false;
  const lastUpdate = lastTs ? formatDateTime(lastTs) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <SidebarDrawer plantName={plantName} />
          <div className="flex items-center gap-2.5">
            <span className="text-base font-semibold text-foreground">
              {plantName}
            </span>
            {!mounted ? (
              <Badge variant="secondary">Menghubungkan...</Badge>
            ) : (
              <Badge
                variant={online ? "online" : "offline"}
                className="gap-1.5"
              >
                <span className="relative flex h-2 w-2">
                  {online && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                  )}
                  <span
                    className={
                      "relative inline-flex h-2 w-2 rounded-full " +
                      (online ? "bg-primary" : "bg-destructive")
                    }
                  />
                </span>
                {online ? "Online" : "Offline"}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="hidden sm:block text-xs text-muted-foreground metric">
              Update: {lastUpdate}
            </span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
