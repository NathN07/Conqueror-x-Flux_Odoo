"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSubscriptionStatusAction } from "@/actions/subscription.actions";
import { Button } from "@/components/ui/button";
import { SubscriptionStatus } from "@prisma/client";
import { Loader2, AlertCircle } from "lucide-react";
import type { SubscriptionAction } from "@/lib/subscription-status";

interface SubscriptionActionsProps {
  subscriptionId: string;
  allowedActions: SubscriptionAction[];
}

export function SubscriptionActions({
  subscriptionId,
  allowedActions,
}: SubscriptionActionsProps) {
  const router = useRouter();
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: SubscriptionAction) => {
    setError(null);
    setLoadingStatus(action.label);

    try {
      const res = await updateSubscriptionStatusAction({
        subscriptionId,
        targetStatus: action.targetStatus,
        isRenewal: action.isRenewal || false,
      });

      if (!res.success) {
        setError(res.error || "Failed to update subscription status.");
        return;
      }

      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoadingStatus(null);
    }
  };

  if (allowedActions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {allowedActions.map((action, idx) => {
          const isLoading = loadingStatus === action.label;

          return (
            <Button
              key={idx}
              variant={action.variant}
              size="sm"
              disabled={loadingStatus !== null}
              onClick={() => handleAction(action)}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                action.label
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
