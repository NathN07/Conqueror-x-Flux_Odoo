import { SubscriptionStatus } from "@prisma/client";

export interface PlanRules {
  allowPause?: boolean;
  allowEarlyClose?: boolean;
  allowRenewal?: boolean;
  autoCloseOnEnd?: boolean;
}

export interface TransitionResult {
  allowed: boolean;
  error?: string;
  actionLabel?: string;
}

export interface SubscriptionAction {
  targetStatus: SubscriptionStatus;
  label: string;
  isRenewal?: boolean;
  variant: "default" | "secondary" | "destructive" | "outline";
}

/**
 * Pure function to check if a status transition is valid according to business rules and plan capabilities.
 * Flow: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED
 * PAUSED: only from ACTIVE (and back to ACTIVE), and only if plan.allowPause is true.
 * Early close: only if plan.allowEarlyClose is true.
 * Renew: only if plan.allowRenewal is true.
 */
export function canTransition(
  from: SubscriptionStatus,
  to: SubscriptionStatus,
  planRules: PlanRules = {
    allowPause: true,
    allowEarlyClose: true,
    allowRenewal: true,
  },
  isRenewal = false
): TransitionResult {
  // 1. Same status transition (unless it's an explicit renewal of ACTIVE or CLOSED)
  if (from === to && !isRenewal) {
    return {
      allowed: false,
      error: `Subscription is already in ${from} status.`,
    };
  }

  // 2. Renewal handling (can renew ACTIVE or CLOSED subscriptions to ACTIVE)
  if (isRenewal) {
    if (to !== SubscriptionStatus.ACTIVE) {
      return {
        allowed: false,
        error: "Renewal must result in an ACTIVE subscription.",
      };
    }
    if (from !== SubscriptionStatus.ACTIVE && from !== SubscriptionStatus.CLOSED) {
      return {
        allowed: false,
        error: `Only ACTIVE or CLOSED subscriptions can be renewed, but current status is ${from}.`,
      };
    }
    if (!planRules.allowRenewal) {
      return {
        allowed: false,
        error: "Cannot renew subscription: this plan does not allow renewals.",
      };
    }
    return { allowed: true, actionLabel: "Renew Subscription" };
  }

  // 3. Pause handling
  if (to === SubscriptionStatus.PAUSED) {
    if (from !== SubscriptionStatus.ACTIVE) {
      return {
        allowed: false,
        error: `Subscriptions can only be paused from the ACTIVE status, not from ${from}.`,
      };
    }
    if (!planRules.allowPause) {
      return {
        allowed: false,
        error: "Cannot pause subscription: this plan does not allow pausing.",
      };
    }
    return { allowed: true, actionLabel: "Pause Subscription" };
  }

  // 4. Resume from Pause handling
  if (from === SubscriptionStatus.PAUSED) {
    if (to === SubscriptionStatus.ACTIVE) {
      return { allowed: true, actionLabel: "Resume Subscription" };
    }
    if (to === SubscriptionStatus.CLOSED) {
      if (!planRules.allowEarlyClose) {
        return {
          allowed: false,
          error: "Cannot close subscription: this plan does not allow early closure.",
        };
      }
      return { allowed: true, actionLabel: "Close Subscription" };
    }
    return {
      allowed: false,
      error: `Cannot transition from PAUSED directly to ${to}. You must resume to ACTIVE first.`,
    };
  }

  // 5. Early closure handling
  if (to === SubscriptionStatus.CLOSED) {
    if (from === SubscriptionStatus.CLOSED) {
      return {
        allowed: false,
        error: "Subscription is already closed.",
      };
    }
    // Closing from DRAFT, QUOTATION, CONFIRMED, or ACTIVE
    if (!planRules.allowEarlyClose) {
      return {
        allowed: false,
        error: "Cannot close subscription early: this plan does not allow early closure.",
      };
    }
    return { allowed: true, actionLabel: "Close Subscription" };
  }

  // 6. Standard forward lifecycle transitions
  switch (from) {
    case SubscriptionStatus.DRAFT:
      if (to === SubscriptionStatus.QUOTATION) {
        return { allowed: true, actionLabel: "Convert to Quotation" };
      }
      break;

    case SubscriptionStatus.QUOTATION:
      if (to === SubscriptionStatus.CONFIRMED) {
        return { allowed: true, actionLabel: "Confirm Quotation" };
      }
      break;

    case SubscriptionStatus.CONFIRMED:
      if (to === SubscriptionStatus.ACTIVE) {
        return { allowed: true, actionLabel: "Activate Subscription" };
      }
      break;

    case SubscriptionStatus.ACTIVE:
      // Other ACTIVE transitions (PAUSED, CLOSED, RENEW) are handled above
      break;

    case SubscriptionStatus.CLOSED:
      // CLOSED can only be renewed (handled in isRenewal above)
      break;
  }

  // 7. Any other unexpected transitions blocked
  return {
    allowed: false,
    error: `Invalid status transition: cannot move directly from ${from} to ${to}.`,
  };
}

/**
 * Returns the list of permitted actions a user can take on a subscription given its current status and plan rules.
 */
export function getAllowedActions(
  status: SubscriptionStatus,
  planRules: PlanRules = {
    allowPause: true,
    allowEarlyClose: true,
    allowRenewal: true,
  }
): SubscriptionAction[] {
  const actions: SubscriptionAction[] = [];

  switch (status) {
    case SubscriptionStatus.DRAFT:
      actions.push({
        targetStatus: SubscriptionStatus.QUOTATION,
        label: "Send Quotation",
        variant: "default",
      });
      if (planRules.allowEarlyClose) {
        actions.push({
          targetStatus: SubscriptionStatus.CLOSED,
          label: "Discard / Close",
          variant: "destructive",
        });
      }
      break;

    case SubscriptionStatus.QUOTATION:
      actions.push({
        targetStatus: SubscriptionStatus.CONFIRMED,
        label: "Confirm Quote",
        variant: "default",
      });
      if (planRules.allowEarlyClose) {
        actions.push({
          targetStatus: SubscriptionStatus.CLOSED,
          label: "Reject Quote",
          variant: "destructive",
        });
      }
      break;

    case SubscriptionStatus.CONFIRMED:
      actions.push({
        targetStatus: SubscriptionStatus.ACTIVE,
        label: "Activate Subscription",
        variant: "default",
      });
      if (planRules.allowEarlyClose) {
        actions.push({
          targetStatus: SubscriptionStatus.CLOSED,
          label: "Cancel Subscription",
          variant: "destructive",
        });
      }
      break;

    case SubscriptionStatus.ACTIVE:
      if (planRules.allowPause) {
        actions.push({
          targetStatus: SubscriptionStatus.PAUSED,
          label: "Pause Subscription",
          variant: "secondary",
        });
      }
      if (planRules.allowRenewal) {
        actions.push({
          targetStatus: SubscriptionStatus.ACTIVE,
          label: "Renew Plan",
          isRenewal: true,
          variant: "outline",
        });
      }
      if (planRules.allowEarlyClose) {
        actions.push({
          targetStatus: SubscriptionStatus.CLOSED,
          label: "Close Early",
          variant: "destructive",
        });
      }
      break;

    case SubscriptionStatus.PAUSED:
      actions.push({
        targetStatus: SubscriptionStatus.ACTIVE,
        label: "Resume Subscription",
        variant: "default",
      });
      if (planRules.allowEarlyClose) {
        actions.push({
          targetStatus: SubscriptionStatus.CLOSED,
          label: "Close Subscription",
          variant: "destructive",
        });
      }
      break;

    case SubscriptionStatus.CLOSED:
      if (planRules.allowRenewal) {
        actions.push({
          targetStatus: SubscriptionStatus.ACTIVE,
          label: "Renew Subscription",
          isRenewal: true,
          variant: "default",
        });
      }
      break;
  }

  return actions;
}
