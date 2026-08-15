import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// CPM = (cost / views) * 1000
export function calculateCpm(cost: number, views: number): number {
  if (!Number.isFinite(cost) || !Number.isFinite(views) || cost <= 0 || views <= 0) {
    return 0
  }

  return (cost / views) * 1000
}

// Payout from CPM = (views / 1000) * cpm
export function calculatePayoutFromCpm(views: number, cpm: number): number {
  if (!Number.isFinite(views) || !Number.isFinite(cpm) || views <= 0 || cpm <= 0) {
    return 0
  }

  return (views / 1000) * cpm
}
