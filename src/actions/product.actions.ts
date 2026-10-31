"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { Role } from "@prisma/client";
import {
  productSchema,
  productVariantSchema,
  type ProductInput,
  type ProductVariantInput,
} from "@/lib/validations/product";
import { parseInrToPaise } from "@/lib/money";
import { revalidatePath } from "next/cache";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  canArchive?: boolean;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Create a new product (ADMIN only)
 */
export async function createProductAction(
  rawInput: ProductInput
): Promise<ActionResponse<{ id: string; name: string }>> {
  await requireRole(Role.ADMIN);

  const parsed = productSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please review the form errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, type, salesPriceInInr, costPriceInInr, notes, isActive } =
    parsed.data;

  const salesPrice = parseInrToPaise(salesPriceInInr);
  const costPrice = parseInrToPaise(costPriceInInr);

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      type: type || "SOFTWARE",
      salesPrice,
      costPrice,
      notes: notes?.trim() || null,
      isActive,
    },
  });

  revalidatePath("/products");
  return {
    success: true,
    data: { id: product.id, name: product.name },
  };
}

/**
 * Update an existing product (ADMIN only)
 */
export async function updateProductAction(
  id: string,
  rawInput: ProductInput
): Promise<ActionResponse<{ id: string; name: string }>> {
  await requireRole(Role.ADMIN);

  const parsed = productSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please review the form errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, type, salesPriceInInr, costPriceInInr, notes, isActive } =
    parsed.data;

  const salesPrice = parseInrToPaise(salesPriceInInr);
  const costPrice = parseInrToPaise(costPriceInInr);

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: name.trim(),
      type: type || "SOFTWARE",
      salesPrice,
      costPrice,
      notes: notes?.trim() || null,
      isActive,
    },
  });

  revalidatePath(`/products/${id}`);
  revalidatePath("/products");
  return {
    success: true,
    data: { id: product.id, name: product.name },
  };
}

/**
 * Delete a product (ADMIN only).
 * If used in any subscription or invoice, deletion is blocked and archiving is offered.
 */
export async function deleteProductAction(
  id: string
): Promise<ActionResponse<void>> {
  await requireRole(Role.ADMIN);

  const subLinesCount = await prisma.subscriptionLine.count({
    where: { productId: id },
  });
  const invoiceLinesCount = await prisma.invoiceLine.count({
    where: { productId: id },
  });

  if (subLinesCount > 0 || invoiceLinesCount > 0) {
    return {
      success: false,
      canArchive: true,
      error: `Cannot delete product: it is currently used in ${subLinesCount} subscription line(s) and ${invoiceLinesCount} invoice line(s). Please archive it instead.`,
    };
  }

  await prisma.product.delete({
    where: { id },
  });

  revalidatePath("/products");
  return { success: true };
}

/**
 * Toggle product archive / active status (ADMIN only)
 */
export async function toggleProductArchiveAction(
  id: string
): Promise<ActionResponse<{ isActive: boolean }>> {
  await requireRole(Role.ADMIN);

  const existing = await prisma.product.findUnique({
    where: { id },
    select: { isActive: true },
  });

  if (!existing) {
    return { success: false, error: "Product not found." };
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  revalidatePath(`/products/${id}`);
  revalidatePath("/products");
  return { success: true, data: { isActive: updated.isActive } };
}

/**
 * Add a variant to a product (ADMIN only)
 */
export async function createProductVariantAction(
  productId: string,
  rawInput: ProductVariantInput
): Promise<ActionResponse<{ id: string }>> {
  await requireRole(Role.ADMIN);

  const parsed = productVariantSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please review the variant form errors.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, sku, priceSurchargeInInr } = parsed.data;
  const priceSurcharge = parseInrToPaise(priceSurchargeInInr);

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      name: name.trim(),
      sku: sku?.trim() || null,
      priceSurcharge,
      isActive: true,
    },
  });

  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  return { success: true, data: { id: variant.id } };
}

/**
 * Delete or deactivate a variant (ADMIN only)
 */
export async function deleteProductVariantAction(
  productId: string,
  variantId: string
): Promise<ActionResponse<void>> {
  await requireRole(Role.ADMIN);

  const subLinesCount = await prisma.subscriptionLine.count({
    where: { variantId },
  });

  if (subLinesCount > 0) {
    // If in use, deactivate instead of deleting to maintain database integrity
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { isActive: false },
    });
    revalidatePath(`/products/${productId}`);
    return {
      success: true,
      error: "Variant is used in existing contracts. It has been deactivated instead of deleted.",
    };
  }

  await prisma.productVariant.delete({
    where: { id: variantId },
  });

  revalidatePath(`/products/${productId}`);
  return { success: true };
}
