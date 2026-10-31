import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  method: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: "Please select a valid payment method" }),
  }),
  amountInInr: z
    .number({ invalid_type_error: "Payment amount must be a number" })
    .positive("Payment amount must be greater than ₹0.00"),
  paymentDate: z.string().optional().nullable(),
  transactionRef: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
