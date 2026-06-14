"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-right"
      richColors
      closeButton
      duration={3500}
      toastOptions={{
        classNames: {
          toast: "border-border bg-card text-foreground shadow-lg",
        },
      }}
    />
  );
}
