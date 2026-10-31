"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import { planSchema, type PlanInput } from "@/lib/validations/plan";
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
 * Create a new billing plan (ADMIN only)
 */
export async function createPlanAction(
  rawInput: PlanInput
): Promise<ActionResponse<{ id: string; name: string }>> {
  await requireRole(Role.ADMIN);

  const parsed = planSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the validation errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    name,
    billingFrequency,
    priceInInr,
    minQuantity,
    startDate,
    endDate,
    autoCloseOnEnd,
    allowEarlyClose,
    allowPause,
    allowRenewal,
    isActive,
  } = parsed.data;

  const basePrice = parseInrToPaise(priceInInr);

  const plan = await prisma.plan.create({
    data: {
      name: name.trim(),
      billingFrequency,
      basePrice,
      minQuantity,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      autoCloseOnEnd,
      allowEarlyClose,
      allowPause,
      allowRenewal,
      isActive,
    },
  });

  revalidatePath("/plans");
  return {
    success: true,
    data: { id: plan.id, name: plan.name },
  };
}

/**
 * Update an existing plan (ADMIN only)
 */
export async function updatePlanAction(
  id: string,
  rawInput: PlanInput
): Promise<ActionResponse<{ id: string; name: string }>> {
  await requireRole(Role.ADMIN);

  const parsed = planSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the validation errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    name,
    billingFrequency,
    priceInInr,
    minQuantity,
    startDate,
    endDate,
    autoCloseOnEnd,
    allowEarlyClose,
    allowPause,
    allowRenewal,
    isActive,
  } = parsed.data;

  const basePrice = parseInrToPaise(priceInInr);

  const plan = await prisma.plan.update({
    where: { id },
    data: {
      name: name.trim(),
      billingFrequency,
      basePrice,
      minQuantity,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      autoCloseOnEnd,
      allowEarlyClose,
      allowPause,
      allowRenewal,
      isActive,
    },
  });

  revalidatePath("/plans");
  return {
    success: true,
    data: { id: plan.id, name: plan.name },
  };
}

/**
 * Toggle plan active status (ADMIN only)
 */
export async function togglePlanStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse> {
  await requireRole(Role.ADMIN);

  await prisma.plan.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/plans");
  return { success: true };
}

/**
 * Delete a plan (ADMIN only)
 * If referenced by subscriptions or quotation templates, block deletion.
 */
export async function deletePlanAction(
  id: string
): Promise<ActionResponse> {
  await requireRole(Role.ADMIN);

  const [subscriptionsCount, templatesCount] = await Promise.all([
    prisma.subscription.count({ where: { planId: id } }),
    prisma.quotationTemplate.count({ where: { planId: id } }),
  ]);

  if (subscriptionsCount > 0 || templatesCount > 0) {
    return {
      success: false,
      error: `Cannot delete plan: it is used in ${subscriptionsCount} subscription(s) and ${templatesCount} quotation template(s). Consider deactivating it instead.`,
      canArchive: true,
    };
  }

  await prisma.plan.delete({
    where: { id },
  });

  revalidatePath("/plans");
  return { success: true };
}
