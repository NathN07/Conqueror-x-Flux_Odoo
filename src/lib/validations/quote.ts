import { z } from "zod";

export const templateLineInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional().nullable(),
  quantity: z
    .number({ invalid_type_error: "Quantity must be a number" })
    .int()
    .min(1, "Quantity must be at least 1"),
});

export const quotationTemplateSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters"),
  planId: z.string().min(1, "Plan is required"),
  validityDays: z
    .number({ invalid_type_error: "Validity days must be a number" })
    .int()
    .min(1, "Validity must be at least 1 day")
    .default(30),
  terms: z.string().optional().nullable(),
  lines: z
    .array(templateLineInputSchema)
    .min(1, "At least one product line is required"),
  isActive: z.boolean().default(true),
});

export type TemplateLineInput = z.infer<typeof templateLineInputSchema>;
export type QuotationTemplateInput = z.infer<typeof quotationTemplateSchema>;
