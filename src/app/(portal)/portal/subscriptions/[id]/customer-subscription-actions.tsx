"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { customerUpdateSubscriptionStatusAction } from "@/actions/subscription.actions";
import { Button } from "@/components/ui/button";
import { SubscriptionStatus } from "@prisma/client";
import {
  PauseCircle,
  PlayCircle,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface CustomerSubscriptionActionsProps {
  subscriptionId: string;
  status: SubscriptionStatus;
  planRules: {
    allowPause: boolean;
    allowEarlyClose: boolean;
    allowRenewal: boolean;
  };
}

export function CustomerSubscriptionActions({
  subscriptionId,
  status,
  planRules,
}: CustomerSubscriptionActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const handleUpdate = async (
    targetStatus: SubscriptionStatus,
    actionKey: string,
    isRenewal = false
  ) => {
    setFeedback(null);
    setLoadingAction(actionKey);

    try {
      const res = await customerUpdateSubscriptionStatusAction({
        subscriptionId,
        targetStatus,
        isRenewal,
      });

      if (!res.success) {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update subscription.",
        });
        return;
      }

      setFeedback({
        type: "success",
        message: `Subscription successfully updated to ${res.data?.status}.`,
      });
      setShowCloseModal(false);
      router.refresh();
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setLoadingAction(null);
    }
  };

  const canPause = status === SubscriptionStatus.ACTIVE && planRules.allowPause;
  const canResume = status === SubscriptionStatus.PAUSED;
  const canClose =
    (status === SubscriptionStatus.ACTIVE ||
      status === SubscriptionStatus.PAUSED ||
      status === SubscriptionStatus.CONFIRMED) &&
    planRules.allowEarlyClose;
  const canRenew =
    (status === SubscriptionStatus.ACTIVE ||
      status === SubscriptionStatus.CLOSED) &&
    planRules.allowRenewal;

  const hasAnyAction = canPause || canResume || canClose || canRenew;

  if (!hasAnyAction) {
    return null;
  }

  return (
    <div className="space-y-4">
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
        {/* Pause Button */}
        {canPause && (
          <Button
            variant="outline"
            size="sm"
            disabled={loadingAction !== null}
            onClick={() => handleUpdate(SubscriptionStatus.PAUSED, "pause")}
            className="flex items-center gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            {loadingAction === "pause" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PauseCircle className="h-3.5 w-3.5" />
            )}
            Pause Subscription
          </Button>
        )}

        {/* Resume Button */}
        {canResume && (
          <Button
            size="sm"
            disabled={loadingAction !== null}
            onClick={() => handleUpdate(SubscriptionStatus.ACTIVE, "resume")}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {loadingAction === "resume" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
            Resume Subscription
          </Button>
        )}

        {/* Renew Button */}
        {canRenew && (
          <Button
            variant="outline"
            size="sm"
            disabled={loadingAction !== null}
            onClick={() =>
              handleUpdate(SubscriptionStatus.ACTIVE, "renew", true)
            }
            className="flex items-center gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            {loadingAction === "renew" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Renew Plan
          </Button>
        )}

        {/* Close Button with Confirmation Modal Trigger */}
        {canClose && (
          <Button
            variant="destructive"
            size="sm"
            disabled={loadingAction !== null}
            onClick={() => setShowCloseModal(true)}
            className="flex items-center gap-1.5"
          >
            <XCircle className="h-3.5 w-3.5" />
            Close Subscription
          </Button>
        )}
      </div>

      {/* Confirmation Dialog before Closing */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-600 mb-2">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">
                Cancel / Close Subscription?
              </h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to close this subscription? This will stop upcoming recurring billing cycles and move the contract to Closed.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingAction !== null}
                onClick={() => setShowCloseModal(false)}
              >
                Keep Active
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={loadingAction !== null}
                onClick={() => handleUpdate(SubscriptionStatus.CLOSED, "close")}
              >
                {loadingAction === "close" ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Closing...
                  </>
                ) : (
                  "Yes, Close Subscription"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
