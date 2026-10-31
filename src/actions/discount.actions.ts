"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role, DiscountType, DiscountAppliesTo } from "@prisma/client";
import {
  discountRuleSchema,
  type DiscountRuleInput,
} from "@/lib/validations/discount";
import { parseInrToPaise } from "@/lib/money";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  canArchive?: boolean;
};

/**
 * Create a new discount rule (ADMIN only)
 */
export async function createDiscountAction(
  rawInput: DiscountRuleInput
): Promise<ActionResponse<{ id: string; code: string }>> {
  await requireRole(Role.ADMIN);

  const parsed = discountRuleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the validation errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    code,
    name,
    type,
    appliesTo,
    value,
    minAmountInInr,
    minQuantity,
    maxUses,
    startDate,
    endDate,
    productId,
    isActive,
  } = parsed.data;

  // Check unique code
  const existing = await prisma.discountRule.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (existing) {
    return {
      success: false,
      error: "A discount rule with this coupon code already exists.",
      fieldErrors: { code: ["Coupon code must be unique"] },
    };
  }

  // If type is FIXED, value is in INR -> convert to paise. If PERCENTAGE, value is percentage integer.
  const storedValue =
    type === DiscountType.FIXED ? parseInrToPaise(value) : Math.round(value);

  const minAmount = parseInrToPaise(minAmountInInr || 0);

  const rule = await prisma.discountRule.create({
    data: {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      type,
      appliesTo,
      value: storedValue,
      minAmount,
      minQuantity: minQuantity || 0,
      maxUses: maxUses || null,
      usedCount: 0,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      productId: appliesTo === DiscountAppliesTo.PRODUCT ? productId || null : null,
      isActive,
    },
  });

  revalidatePath("/discounts");
  return {
    success: true,
    data: { id: rule.id, code: rule.code },
  };
}

/**
 * Update an existing discount rule (ADMIN only)
 */
export async function updateDiscountAction(
  id: string,
  rawInput: DiscountRuleInput
): Promise<ActionResponse<{ id: string; code: string }>> {
  await requireRole(Role.ADMIN);

  const parsed = discountRuleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the validation errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    code,
    name,
    type,
    appliesTo,
    value,
    minAmountInInr,
    minQuantity,
    maxUses,
    startDate,
    endDate,
    productId,
    isActive,
  } = parsed.data;

  // Check code collision if code changed
  const existing = await prisma.discountRule.findFirst({
    where: {
      code: code.trim().toUpperCase(),
      id: { not: id },
    },
  });
  if (existing) {
    return {
      success: false,
      error: "Another discount rule with this coupon code already exists.",
      fieldErrors: { code: ["Coupon code must be unique"] },
    };
  }

  const storedValue =
    type === DiscountType.FIXED ? parseInrToPaise(value) : Math.round(value);

  const minAmount = parseInrToPaise(minAmountInInr || 0);

  const rule = await prisma.discountRule.update({
    where: { id },
    data: {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      type,
      appliesTo,
      value: storedValue,
      minAmount,
      minQuantity: minQuantity || 0,
      maxUses: maxUses || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      productId: appliesTo === DiscountAppliesTo.PRODUCT ? productId || null : null,
      isActive,
    },
  });

  revalidatePath("/discounts");
  return {
    success: true,
    data: { id: rule.id, code: rule.code },
  };
}

/**
 * Toggle discount rule active status (ADMIN only)
 */
export async function toggleDiscountStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse> {
  await requireRole(Role.ADMIN);

  await prisma.discountRule.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/discounts");
  return { success: true };
}

/**
 * Delete a discount rule (ADMIN only)
 */
export async function deleteDiscountAction(
  id: string
): Promise<ActionResponse> {
  await requireRole(Role.ADMIN);

  const subsCount = await prisma.subscription.count({
    where: { discountRuleId: id },
  });

  if (subsCount > 0) {
    return {
      success: false,
      error: `Cannot delete discount: it has been applied to ${subsCount} subscription(s). Please deactivate it instead to preserve audit logs.`,
      canArchive: true,
    };
  }

  await prisma.discountRule.delete({
    where: { id },
  });

  revalidatePath("/discounts");
  return { success: true };
}
