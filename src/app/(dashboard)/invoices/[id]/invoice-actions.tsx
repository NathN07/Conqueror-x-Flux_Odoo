"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmInvoiceAction,
  cancelInvoiceAction,
  sendInvoiceAction,
} from "@/actions/invoice.actions";
import { Button } from "@/components/ui/button";
import { InvoiceStatus } from "@prisma/client";
import {
  CheckCircle2,
  XCircle,
  Mail,
  Printer,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface InvoiceActionsProps {
  invoiceId: string;
  status: InvoiceStatus;
  hasPayments: boolean;
}

export function InvoiceActions({
  invoiceId,
  status,
  hasPayments,
}: InvoiceActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleConfirm = async () => {
    setFeedback(null);
    setLoadingAction("confirm");

    try {
      const res = await confirmInvoiceAction({ invoiceId });
      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "Failed to confirm invoice." });
        return;
      }
      setFeedback({ type: "success", message: "Invoice has been confirmed." });
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this invoice? This action cannot be undone.")) {
      return;
    }

    setFeedback(null);
    setLoadingAction("cancel");

    try {
      const res = await cancelInvoiceAction({ invoiceId, reason: "Cancelled by staff/admin" });
      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "Failed to cancel invoice." });
        return;
      }
      setFeedback({ type: "success", message: "Invoice has been cancelled." });
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSend = async () => {
    setFeedback(null);
    setLoadingAction("send");

    try {
      const res = await sendInvoiceAction({ invoiceId });
      if (!res.success) {
        setFeedback({ type: "error", message: res.error || "Failed to send invoice email." });
        return;
      }
      setFeedback({
        type: "success",
        message: res.data?.message || "Invoice has been sent to the customer.",
      });
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setLoadingAction(null);
    }
  };

  const canConfirm = status === InvoiceStatus.DRAFT;
  const canCancel =
    (status === InvoiceStatus.DRAFT || status === InvoiceStatus.CONFIRMED) && !hasPayments;

  return (
    <div className="space-y-3">
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Send Action */}
        <Button
          variant="outline"
          size="sm"
          disabled={loadingAction !== null || status === InvoiceStatus.CANCELLED}
          onClick={handleSend}
          className="flex items-center gap-1.5"
        >
          {loadingAction === "send" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Mail className="h-3.5 w-3.5 text-blue-600" />
          )}
          Send to Customer
        </Button>

        {/* Print Action */}
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex items-center gap-1.5"
        >
          <Link href={`/invoices/${invoiceId}/print`} target="_blank">
            <Printer className="h-3.5 w-3.5 text-slate-600" />
            Print Invoice
          </Link>
        </Button>

        {/* Confirm Action */}
        {canConfirm && (
          <Button
            size="sm"
            disabled={loadingAction !== null}
            onClick={handleConfirm}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700"
          >
            {loadingAction === "confirm" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Confirm Invoice
          </Button>
        )}

        {/* Cancel Action */}
        {canCancel && (
          <Button
            variant="destructive"
            size="sm"
            disabled={loadingAction !== null}
            onClick={handleCancel}
            className="flex items-center gap-1.5"
          >
            {loadingAction === "cancel" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Cancel Invoice
          </Button>
        )}
      </div>
    </div>
  );
}
