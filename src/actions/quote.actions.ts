"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  quotationTemplateSchema,
  type QuotationTemplateInput,
} from "@/lib/validations/quote";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Create a new quotation template (ADMIN or STAFF)
 */
export async function createTemplateAction(
  rawInput: QuotationTemplateInput
): Promise<ActionResponse<{ id: string; name: string }>> {
  await requireRole(Role.ADMIN, Role.STAFF);

  const parsed = quotationTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the validation errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, planId, validityDays, terms, lines, isActive } = parsed.data;

  // Verify plan exists
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    return {
      success: false,
      error: "Selected plan does not exist.",
      fieldErrors: { planId: ["Invalid plan selected"] },
    };
  }

  // Calculate unitPrice for each line from product salesPrice + variant priceSurcharge
  const productIds = lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const linesToCreate = lines.map((line) => {
    const product = productMap.get(line.productId);
    if (!product) {
      throw new Error(`Product ${line.productId} not found.`);
    }

    let surcharge = 0;
    if (line.variantId) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (variant) {
        surcharge = variant.priceSurcharge;
      }
    }

    const unitPrice = product.salesPrice + surcharge;

    return {
      productId: line.productId,
      variantId: line.variantId || null,
      quantity: line.quantity,
      unitPrice,
    };
  });

  const template = await prisma.quotationTemplate.create({
    data: {
      name: name.trim(),
      planId,
      validityDays,
      terms: terms?.trim() || null,
      isActive,
      lines: {
        create: linesToCreate,
      },
    },
  });

  revalidatePath("/quotes");
  revalidatePath("/subscriptions/new");
  return {
    success: true,
    data: { id: template.id, name: template.name },
  };
}

/**
 * Update an existing quotation template (ADMIN or STAFF)
 */
export async function updateTemplateAction(
  id: string,
  rawInput: QuotationTemplateInput
): Promise<ActionResponse<{ id: string; name: string }>> {
  await requireRole(Role.ADMIN, Role.STAFF);

  const parsed = quotationTemplateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the validation errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, planId, validityDays, terms, lines, isActive } = parsed.data;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    return {
      success: false,
      error: "Selected plan does not exist.",
      fieldErrors: { planId: ["Invalid plan selected"] },
    };
  }

  const productIds = lines.map((l) => l.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const linesToCreate = lines.map((line) => {
    const product = productMap.get(line.productId);
    if (!product) {
      throw new Error(`Product ${line.productId} not found.`);
    }

    let surcharge = 0;
    if (line.variantId) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (variant) {
        surcharge = variant.priceSurcharge;
      }
    }

    const unitPrice = product.salesPrice + surcharge;

    return {
      productId: line.productId,
      variantId: line.variantId || null,
      quantity: line.quantity,
      unitPrice,
    };
  });

  const template = await prisma.$transaction(
    async (tx) => {
      // Remove old lines
      await tx.templateLine.deleteMany({
        where: { templateId: id },
      });

      // Update template and recreate lines
      return await tx.quotationTemplate.update({
        where: { id },
        data: {
          name: name.trim(),
          planId,
          validityDays,
          terms: terms?.trim() || null,
          isActive,
          lines: {
            create: linesToCreate,
          },
        },
      });
    },
    { maxWait: 15000, timeout: 30000 }
  );

  revalidatePath("/quotes");
  revalidatePath("/subscriptions/new");
  return {
    success: true,
    data: { id: template.id, name: template.name },
  };
}

/**
 * Toggle quotation template active status (ADMIN or STAFF)
 */
export async function toggleTemplateStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse> {
  await requireRole(Role.ADMIN, Role.STAFF);

  await prisma.quotationTemplate.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/quotes");
  revalidatePath("/subscriptions/new");
  return { success: true };
}

/**
 * Delete a quotation template (ADMIN or STAFF)
 */
export async function deleteTemplateAction(
  id: string
): Promise<ActionResponse> {
  await requireRole(Role.ADMIN, Role.STAFF);

  await prisma.quotationTemplate.delete({
    where: { id },
  });

  revalidatePath("/quotes");
  revalidatePath("/subscriptions/new");
  return { success: true };
}
