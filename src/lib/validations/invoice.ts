import { z } from "zod";

export const confirmInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
});

export const cancelInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  reason: z.string().optional(),
});

export const sendInvoiceSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
});

export type ConfirmInvoiceInput = z.infer<typeof confirmInvoiceSchema>;
export type CancelInvoiceInput = z.infer<typeof cancelInvoiceSchema>;
export type SendInvoiceInput = z.infer<typeof sendInvoiceSchema>;
