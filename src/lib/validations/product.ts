import { z } from "zod";

export const productVariantSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Variant name is required (e.g. Brand: Odoo)"),
  sku: z.string().optional().nullable(),
  priceSurchargeInInr: z
    .number({ invalid_type_error: "Surcharge must be a number" })
    .min(0, "Surcharge cannot be negative")
    .default(0),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  type: z.string().default("SOFTWARE"),
  salesPriceInInr: z
    .number({ invalid_type_error: "Sales price must be a number" })
    .min(0, "Sales price cannot be negative"),
  costPriceInInr: z
    .number({ invalid_type_error: "Cost price must be a number" })
    .min(0, "Cost price cannot be negative")
    .default(0),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
