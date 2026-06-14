"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Sun,
  Wind,
  Battery,
  Zap,
  Settings,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const publicNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plts", label: "PLTS (Surya)", icon: Sun },
  { href: "/pltb", label: "PLTB (Angin)", icon: Wind },
  { href: "/baterai", label: "Baterai", icon: Battery },
  { href: "/beban", label: "Beban", icon: Zap },
];

interface SidebarDrawerProps {
  plantName?: string;
}

export function SidebarDrawer({ plantName = "EnergiMon" }: SidebarDrawerProps) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Buka menu navigasi">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-primary">{plantName}</SheetTitle>
          <SheetDescription className="sr-only">
            Menu navigasi utama EnergiMon
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-3 mt-2">
          {publicNav.map(({ href, label, icon: Icon }) => (
            <SheetClose asChild key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </SheetClose>
          ))}

          <Separator className="my-3" />

          <SheetClose asChild>
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              Admin
            </Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
