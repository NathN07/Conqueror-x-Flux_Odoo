import { z } from "zod";
import { DiscountType, DiscountAppliesTo } from "@prisma/client";

export const discountRuleSchema = z
  .object({
    code: z
      .string()
      .min(2, "Code must be at least 2 characters")
      .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, hyphens, and underscores"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    type: z.nativeEnum(DiscountType),
    appliesTo: z.nativeEnum(DiscountAppliesTo),
    value: z
      .number({ invalid_type_error: "Value must be a number" })
      .min(1, "Value must be at least 1"),
    minAmountInInr: z
      .number({ invalid_type_error: "Minimum purchase must be a number" })
      .min(0, "Minimum purchase cannot be negative")
      .default(0),
    minQuantity: z
      .number({ invalid_type_error: "Minimum quantity must be a number" })
      .int()
      .min(0, "Minimum quantity cannot be negative")
      .default(0),
    maxUses: z
      .number({ invalid_type_error: "Usage limit must be a number" })
      .int()
      .min(1, "Usage limit must be at least 1")
      .optional()
      .nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    productId: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.type === DiscountType.PERCENTAGE) {
        return data.value >= 1 && data.value <= 100;
      }
      return true;
    },
    {
      message: "Percentage discount must be between 1% and 100%.",
      path: ["value"],
    }
  )
  .refine(
    (data) => {
      if (data.appliesTo === DiscountAppliesTo.PRODUCT && !data.productId) {
        return false;
      }
      return true;
    },
    {
      message: "Please select a product when discount applies to a specific product.",
      path: ["productId"],
    }
  )
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be on or after start date.",
      path: ["endDate"],
    }
  );

export type DiscountRuleInput = z.infer<typeof discountRuleSchema>;
