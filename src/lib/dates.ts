import { BillingFrequency } from "@prisma/client";

/**
 * UTC Date utility functions for Brightloop
 * Enforces pure UTC date handling across scheduling and billing calculations.
 */

/**
 * Add days to a Date in UTC
 */
export function addDaysUtc(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Calculate the next billing cycle date strictly in UTC
 */
export function calculateNextBillingDate(
  baseDate: Date,
  frequency: BillingFrequency
): Date {
  const next = new Date(baseDate.getTime());

  switch (frequency) {
    case BillingFrequency.DAILY:
      next.setUTCDate(next.getUTCDate() + 1);
      break;

    case BillingFrequency.WEEKLY:
      next.setUTCDate(next.getUTCDate() + 7);
      break;

    case BillingFrequency.MONTHLY: {
      const currentDay = next.getUTCDate();
      next.setUTCMonth(next.getUTCMonth() + 1);
      // Handle month rollover (e.g. Jan 31 -> Feb 28)
      if (next.getUTCDate() !== currentDay) {
        next.setUTCDate(0); // Last day of previous month
      }
      break;
    }

    case BillingFrequency.YEARLY:
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
  }

  return next;
}

/**
 * Check if a date has passed UTC now
 */
export function isPastUtc(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Format a Date or ISO string into a human-readable UTC date format (e.g., "Oct 31, 2026")
 */
export function formatUtcDate(
  date: Date | string | null | undefined,
  includeTime = false
): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";

  const options: Intl.DateTimeFormatOptions = {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime
      ? { hour: "2-digit", minute: "2-digit", hour12: false }
      : {}),
  };

  return d.toLocaleDateString("en-US", options);
}
