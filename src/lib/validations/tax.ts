import { z } from "zod";

export const taxRuleSchema = z.object({
  name: z.string().min(2, "Tax rule name must be at least 2 characters"),
  percentageRate: z
    .number({ invalid_type_error: "Tax rate must be a number" })
    .min(0, "Tax rate cannot be negative")
    .max(100, "Tax rate cannot exceed 100%"),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type TaxRuleInput = z.infer<typeof taxRuleSchema>;
