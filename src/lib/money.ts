/**
 * Money utilities: All monetary amounts stored as integers in paise (1 INR = 100 paise).
 * Avoids any floating-point arithmetic drift.
 */

/**
 * Format integer paise into standard Indian Rupee representation (e.g. 56000 -> "₹560.00")
 */
export function formatPaiseToInr(amountInPaise: number): string {
  if (isNaN(amountInPaise)) return "₹0.00";
  const isNegative = amountInPaise < 0;
  const absPaise = Math.abs(amountInPaise);
  const inr = (absPaise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return isNegative ? `-₹${inr}` : `₹${inr}`;
}

/**
 * Parse INR amount (number or string) into integer paise
 */
export function parseInrToPaise(amountInInr: number | string): number {
  if (typeof amountInInr === "string") {
    // Remove currency symbol, spaces, and commas
    const cleaned = amountInInr.replace(/[₹,\s]/g, "");
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  return Math.round(amountInInr * 100);
}

/**
 * Compute integer tax amount in paise given subtotal in paise and tax rate percentage
 */
export function calculateTaxAmount(
  subtotalInPaise: number,
  percentageRate: number
): number {
  if (subtotalInPaise <= 0 || percentageRate <= 0) return 0;
  return Math.round((subtotalInPaise * percentageRate) / 100);
}
