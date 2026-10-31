import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/db';
import { AppError } from '../../utils/errors';

/**
 * Cross-module pricing interface
 * Calculates effective unit price for a given product and optional variant.
 * Formula: product.salesPrice + (variant?.extraPrice ?? 0)
 */
export async function getUnitPrice(
  productId: string,
  variantId?: string
): Promise<Prisma.Decimal> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      variants: variantId ? { where: { id: variantId } } : false,
    },
  });

  if (!product) {
    throw AppError.notFound(`Product with ID "${productId}" not found`);
  }

  let price = new Prisma.Decimal(product.salesPrice);

  if (variantId && product.variants && product.variants.length > 0) {
    const variant = product.variants[0];
    price = price.plus(variant.extraPrice);
  }

  return price;
}
