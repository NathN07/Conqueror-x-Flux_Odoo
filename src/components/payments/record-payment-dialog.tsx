"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethod } from "@prisma/client";
import { recordPaymentAction } from "@/actions/payment.actions";
import { Button } from "@/components/ui/button";
import { formatPaiseToInr } from "@/lib/money";
import {
  CreditCard,
  Plus,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-react";

export interface PayableInvoiceOption {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number; // in paise
  amountPaid: number; // in paise
  outstanding: number; // in paise
}

interface RecordPaymentDialogProps {
  // If recording for a specific invoice
  targetInvoice?: {
    id: string;
    invoiceNumber: string;
    outstanding: number; // in paise
  };
  // If recording from /payments list with invoice selector
  availableInvoices?: PayableInvoiceOption[];
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "secondary";
  buttonSize?: "default" | "sm" | "lg";
}

export function RecordPaymentDialog({
  targetInvoice,
  availableInvoices = [],
  buttonLabel = "Record Payment",
  buttonVariant = "default",
  buttonSize = "default",
}: RecordPaymentDialogProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    targetInvoice?.id || (availableInvoices[0]?.id ?? "")
  );

  // Active invoice details
  const activeInvoice = targetInvoice
    ? targetInvoice
    : availableInvoices.find((inv) => inv.id === selectedInvoiceId);

  const maxOutstandingInr = activeInvoice
    ? (activeInvoice.outstanding / 100).toFixed(2)
    : "0.00";

  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [amountInInr, setAmountInInr] = useState(maxOutstandingInr);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleOpen = () => {
    const inv = targetInvoice
      ? targetInvoice
      : availableInvoices.find((i) => i.id === selectedInvoiceId) || availableInvoices[0];

    if (inv) {
      setSelectedInvoiceId(inv.id);
      setAmountInInr((inv.outstanding / 100).toFixed(2));
    }
    setError(null);
    setFieldErrors({});
    setIsOpen(true);
  };

  const handleInvoiceSelectChange = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    const chosen = availableInvoices.find((i) => i.id === invoiceId);
    if (chosen) {
      setAmountInInr((chosen.outstanding / 100).toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!selectedInvoiceId) {
      setError("Please select an invoice to record payment against.");
      return;
    }

    const numericAmount = parseFloat(amountInInr);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Payment amount must be greater than ₹0.00");
      return;
    }

    if (activeInvoice && numericAmount > activeInvoice.outstanding / 100) {
      setError(
        `Payment amount cannot exceed remaining outstanding balance of ${formatPaiseToInr(
          activeInvoice.outstanding
        )}.`
      );
      return;
    }

    setIsLoading(true);

    try {
      const res = await recordPaymentAction({
        invoiceId: selectedInvoiceId,
        method,
        amountInInr: numericAmount,
        paymentDate: paymentDate || null,
        transactionRef: transactionRef.trim() || null,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        setError(res.error || "Failed to record payment.");
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      } else {
        setIsOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleOpen}
        className={
          buttonVariant === "default"
            ? "bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            : "flex items-center gap-1.5"
        }
      >
        <CreditCard className="h-4 w-4" />
        <span>{buttonLabel}</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Record Payment
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              {/* Invoice Selection */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Target Invoice <span className="text-rose-500">*</span>
                </label>
                {targetInvoice ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 flex justify-between items-center">
                    <span>{targetInvoice.invoiceNumber}</span>
                    <span className="text-xs font-sans text-slate-500">
                      Balance:{" "}
                      <strong className="text-slate-900">
                        {formatPaiseToInr(targetInvoice.outstanding)}
                      </strong>
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => handleInvoiceSelectChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    {availableInvoices.length === 0 ? (
                      <option value="">No confirmed invoices with outstanding balance</option>
                    ) : (
                      availableInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} - {inv.customerName} (Bal: {formatPaiseToInr(inv.outstanding)})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Payment Method <span className="text-rose-500">*</span>
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="NETBANKING">Net Banking</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              {/* Amount In INR */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-slate-700">
                    Payment Amount (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  {activeInvoice && (
                    <button
                      type="button"
                      onClick={() => setAmountInInr((activeInvoice.outstanding / 100).toFixed(2))}
                      className="text-[11px] text-blue-600 hover:underline"
                    >
                      Pay Full: {formatPaiseToInr(activeInvoice.outstanding)}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={activeInvoice ? activeInvoice.outstanding / 100 : undefined}
                    required
                    value={amountInInr}
                    onChange={(e) => setAmountInInr(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 pl-7 pr-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Partial payments supported. When balance reaches ₹0.00, invoice status becomes PAID.
                </p>
                {fieldErrors.amountInInr && (
                  <p className="text-rose-600 mt-1">{fieldErrors.amountInInr[0]}</p>
                )}
              </div>

              {/* Payment Date */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Payment Date (UTC) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Transaction Reference / UTR / Cheque # (Optional)
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. UPI/2026/893120 or CHQ-4819"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Payment Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Received via branch cash counter or client portal"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isLoading || !selectedInvoiceId}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Record Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
