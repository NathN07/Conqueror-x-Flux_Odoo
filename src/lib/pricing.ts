import { DiscountType, DiscountAppliesTo } from "@prisma/client";

export interface LineForPricing {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitPrice: number; // in paise
  lineAmount: number; // in paise
}

export interface DiscountForPricing {
  id: string;
  code: string;
  name: string;
  type: DiscountType; // PERCENTAGE or FIXED
  appliesTo: DiscountAppliesTo; // PRODUCT or SUBSCRIPTION
  value: number; // percentage (e.g. 10) or amount in paise (e.g. 50000)
  minAmount: number; // in paise
  minQuantity: number;
  maxUses?: number | null;
  usedCount: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  productId?: string | null;
  isActive: boolean;
}

export interface DiscountUsed {
  discountId: string;
  code: string;
  name: string;
  amount: number; // in paise
}

export interface ApplyDiscountsResult {
  discountTotal: number; // in paise
  discountsUsed: DiscountUsed[];
}

export interface TaxRuleForPricing {
  percentageRate: number; // e.g. 18.0 for 18%
}

/**
 * Pure function to evaluate and apply eligible discounts against invoice lines.
 * Strictly calculates all amounts as integers in paise with zero floating-point money.
 */
export function applyDiscounts(
  lines: LineForPricing[],
  discounts: DiscountForPricing[],
  today: Date = new Date()
): ApplyDiscountsResult {
  const totalSubtotal = lines.reduce((sum, l) => sum + l.lineAmount, 0);
  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

  if (totalSubtotal <= 0 || lines.length === 0 || discounts.length === 0) {
    return { discountTotal: 0, discountsUsed: [] };
  }

  const todayTime = today.getTime();
  const discountsUsed: DiscountUsed[] = [];
  let currentAccumulatedDiscount = 0;

  for (const discount of discounts) {
    // 1. Check active status
    if (!discount.isActive) continue;

    // 2. Check date constraints
    if (discount.startDate && new Date(discount.startDate).getTime() > todayTime) {
      continue;
    }
    if (discount.endDate && new Date(discount.endDate).getTime() < todayTime) {
      continue;
    }

    // 3. Check usage limit
    if (discount.maxUses !== null && discount.maxUses !== undefined) {
      if (discount.usedCount >= discount.maxUses) {
        continue;
      }
    }

    // 4. Evaluate applicability by target scope
    if (discount.appliesTo === DiscountAppliesTo.PRODUCT) {
      if (!discount.productId) continue;

      const matchingLines = lines.filter((l) => l.productId === discount.productId);
      if (matchingLines.length === 0) continue;

      const matchingQuantity = matchingLines.reduce((sum, l) => sum + l.quantity, 0);
      const matchingSubtotal = matchingLines.reduce((sum, l) => sum + l.lineAmount, 0);

      // Check minimum thresholds on matching items
      if (matchingQuantity < discount.minQuantity) continue;
      if (matchingSubtotal < discount.minAmount) continue;

      let discountAmount = 0;
      if (discount.type === DiscountType.PERCENTAGE) {
        // Percentage applied across matching lines
        for (const line of matchingLines) {
          discountAmount += Math.round((line.lineAmount * discount.value) / 100);
        }
      } else {
        // Fixed amount in paise, capped at matchingSubtotal
        discountAmount = Math.min(discount.value, matchingSubtotal);
      }

      // Do not allow total discounts to exceed totalSubtotal
      const availableCapacity = totalSubtotal - currentAccumulatedDiscount;
      const effectiveDiscount = Math.min(discountAmount, availableCapacity);

      if (effectiveDiscount > 0) {
        discountsUsed.push({
          discountId: discount.id,
          code: discount.code,
          name: discount.name,
          amount: effectiveDiscount,
        });
        currentAccumulatedDiscount += effectiveDiscount;
      }
    } else if (discount.appliesTo === DiscountAppliesTo.SUBSCRIPTION) {
      // Check minimum thresholds across whole subscription
      if (totalQuantity < discount.minQuantity) continue;
      if (totalSubtotal < discount.minAmount) continue;

      let discountAmount = 0;
      if (discount.type === DiscountType.PERCENTAGE) {
        discountAmount = Math.round((totalSubtotal * discount.value) / 100);
      } else {
        discountAmount = Math.min(discount.value, totalSubtotal);
      }

      const availableCapacity = totalSubtotal - currentAccumulatedDiscount;
      const effectiveDiscount = Math.min(discountAmount, availableCapacity);

      if (effectiveDiscount > 0) {
        discountsUsed.push({
          discountId: discount.id,
          code: discount.code,
          name: discount.name,
          amount: effectiveDiscount,
        });
        currentAccumulatedDiscount += effectiveDiscount;
      }
    }

    // Stop if subtotal has been fully discounted
    if (currentAccumulatedDiscount >= totalSubtotal) {
      break;
    }
  }

  return {
    discountTotal: Math.min(currentAccumulatedDiscount, totalSubtotal),
    discountsUsed,
  };
}

/**
 * Pure function to calculate tax on amount after discount.
 * Rounds cleanly to the nearest paisa.
 */
export function calculateTax(
  amountAfterDiscount: number,
  taxRule?: TaxRuleForPricing | null
): number {
  if (!taxRule || amountAfterDiscount <= 0 || taxRule.percentageRate <= 0) {
    return 0;
  }
  return Math.round((amountAfterDiscount * taxRule.percentageRate) / 100);
}
