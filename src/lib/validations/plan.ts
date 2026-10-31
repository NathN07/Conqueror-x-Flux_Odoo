import { z } from "zod";
import { BillingFrequency } from "@prisma/client";

export const planSchema = z
  .object({
    name: z.string().min(2, "Plan name must be at least 2 characters"),
    billingFrequency: z.nativeEnum(BillingFrequency),
    priceInInr: z
      .number({ invalid_type_error: "Base price must be a number" })
      .min(0, "Base price cannot be negative"),
    minQuantity: z
      .number({ invalid_type_error: "Minimum quantity must be a number" })
      .int()
      .min(1, "Minimum quantity must be at least 1")
      .default(1),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    autoCloseOnEnd: z.boolean().default(false),
    allowEarlyClose: z.boolean().default(true),
    allowPause: z.boolean().default(true),
    allowRenewal: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be strictly after the start date.",
      path: ["endDate"],
    }
  );

export type PlanInput = z.infer<typeof planSchema>;
