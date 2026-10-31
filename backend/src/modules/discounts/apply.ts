import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/db';

export interface DiscountableLine {
  productId: string;
  variantId?: string | null;
  amount: Prisma.Decimal | number;
  quantity: number;
}

export interface AppliedDiscountResult {
  discountId: string;
  amount: Prisma.Decimal;
}

/**
 * Cross-module discount calculation interface
 * Evaluates applicable active discounts for a given set of line items and effective date.
 * Stub implementation returns an empty list.
 */
export async function applyDiscounts(
  _lines: DiscountableLine[],
  _date: Date = new Date()
): Promise<AppliedDiscountResult[]> {
  // STUB: Full discount engine logic will evaluate applicable fixed & percentage discounts
  return [];
}

/**
 * Cross-module discount usage increment interface
 * Increments the usedCount for given discount IDs within an optional Prisma transaction client.
 */
export async function incrementUsage(
  discountIds: string[],
  tx?: Prisma.TransactionClient
): Promise<void> {
  if (!discountIds || discountIds.length === 0) {
    return;
  }

  const client = tx ?? prisma;

  await client.discount.updateMany({
    where: {
      id: { in: discountIds },
    },
    data: {
      usedCount: {
        increment: 1,
      },
    },
  });
}
