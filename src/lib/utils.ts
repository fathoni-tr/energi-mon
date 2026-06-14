import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatWatt(w: number): string {
  if (Math.abs(w) >= 1000) {
    return formatNumber(w / 1000, 2) + " kW";
  }
  return formatNumber(w, 0) + " W";
}

export function formatDateTime(ts: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Makassar",
  }).format(new Date(ts * 1000));
}

export function formatTime(ts: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Makassar",
  }).format(new Date(ts * 1000));
}

export function isOffline(ts: number): boolean {
  return Date.now() / 1000 - ts > 30;
}
