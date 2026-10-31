import { z } from "zod";
import { SubscriptionStatus } from "@prisma/client";

export const subscriptionLineInputSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const createSubscriptionFromScratchSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  planId: z.string().min(1, "Plan is required"),
  startDate: z.string().min(1, "Start date is required"),
  expiryDate: z.string().optional().nullable(),
  paymentTerms: z.string().default("Immediate"),
  notes: z.string().optional().nullable(),
  lines: z
    .array(subscriptionLineInputSchema)
    .min(1, "At least one product line is required"),
});

export const createSubscriptionFromTemplateSchema = z.object({
  templateId: z.string().min(1, "Quotation template is required"),
  customerId: z.string().min(1, "Customer is required"),
  startDate: z.string().min(1, "Start date is required"),
  paymentTerms: z.string().default("Immediate"),
  notes: z.string().optional().nullable(),
});

export const updateSubscriptionStatusSchema = z.object({
  subscriptionId: z.string().min(1, "Subscription ID is required"),
  targetStatus: z.nativeEnum(SubscriptionStatus),
  isRenewal: z.boolean().optional().default(false),
});

export type SubscriptionLineInput = z.infer<typeof subscriptionLineInputSchema>;
export type CreateSubscriptionFromScratchInput = z.infer<
  typeof createSubscriptionFromScratchSchema
>;
export type CreateSubscriptionFromTemplateInput = z.infer<
  typeof createSubscriptionFromTemplateSchema
>;
export type UpdateSubscriptionStatusInput = z.infer<
  typeof updateSubscriptionStatusSchema
>;
