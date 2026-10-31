"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { taxRuleSchema, type TaxRuleInput } from "@/lib/validations/tax";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Create a new tax rule (ADMIN only)
 */
export async function createTaxAction(
  rawInput: TaxRuleInput
): Promise<ActionResponse<{ id: string; name: string }>> {
  await requireRole(Role.ADMIN);

  const parsed = taxRuleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the validation errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, percentageRate, isDefault, isActive } = parsed.data;

  const result = await prisma.$transaction(
    async (tx) => {
      // If setting this one as default, unset other defaults
      if (isDefault) {
        await tx.taxRule.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      return await tx.taxRule.create({
        data: {
          name: name.trim(),
          percentageRate,
          isDefault,
          isActive,
        },
      });
    },
    { maxWait: 15000, timeout: 30000 }
  );

  revalidatePath("/taxes");
  return {
    success: true,
    data: { id: result.id, name: result.name },
  };
}

/**
 * Update an existing tax rule (ADMIN only)
 */
export async function updateTaxAction(
  id: string,
  rawInput: TaxRuleInput
): Promise<ActionResponse<{ id: string; name: string }>> {
  await requireRole(Role.ADMIN);

  const parsed = taxRuleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the validation errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, percentageRate, isDefault, isActive } = parsed.data;

  const result = await prisma.$transaction(
    async (tx) => {
      if (isDefault) {
        await tx.taxRule.updateMany({
          where: { id: { not: id }, isDefault: true },
          data: { isDefault: false },
        });
      }

      return await tx.taxRule.update({
        where: { id },
        data: {
          name: name.trim(),
          percentageRate,
          isDefault,
          isActive,
        },
      });
    },
    { maxWait: 15000, timeout: 30000 }
  );

  revalidatePath("/taxes");
  return {
    success: true,
    data: { id: result.id, name: result.name },
  };
}

/**
 * Toggle tax rule active status (ADMIN only)
 */
export async function toggleTaxStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse> {
  await requireRole(Role.ADMIN);

  await prisma.taxRule.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/taxes");
  return { success: true };
}

/**
 * Set a tax rule as the single default (ADMIN only)
 */
export async function setDefaultTaxAction(id: string): Promise<ActionResponse> {
  await requireRole(Role.ADMIN);

  await prisma.$transaction(
    async (tx) => {
      await tx.taxRule.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });

      await tx.taxRule.update({
        where: { id },
        data: { isDefault: true, isActive: true },
      });
    },
    { maxWait: 15000, timeout: 30000 }
  );

  revalidatePath("/taxes");
  return { success: true };
}

/**
 * Delete a tax rule (ADMIN only)
 */
export async function deleteTaxAction(id: string): Promise<ActionResponse> {
  await requireRole(Role.ADMIN);

  const tax = await prisma.taxRule.findUnique({ where: { id } });
  if (tax?.isDefault) {
    return {
      success: false,
      error: "Cannot delete the default tax rule. Designate another tax rule as default first.",
    };
  }

  await prisma.taxRule.delete({
    where: { id },
  });

  revalidatePath("/taxes");
  return { success: true };
}
