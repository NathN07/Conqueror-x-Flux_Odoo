import { prisma } from "@/lib/prisma";
import { SubscriptionStatus } from "@prisma/client";

export interface CloseExpiredResult {
  closedCount: number;
  closedSubscriptionNumbers: string[];
}

/**
 * Background / Admin job that automatically closes ACTIVE subscriptions
 * that have passed their explicit expiryDate or whose plan has autoCloseOnEnd
 * and the plan's endDate has passed.
 */
export async function closeExpiredSubscriptions(): Promise<CloseExpiredResult> {
  const now = new Date();

  // Find active subscriptions that are expired
  const expiredActiveSubscriptions = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      OR: [
        // Past explicit subscription expiry
        {
          expiryDate: {
            lt: now,
          },
        },
        // Plan has autoCloseOnEnd and plan's endDate has passed
        {
          plan: {
            autoCloseOnEnd: true,
            endDate: {
              lt: now,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      subscriptionNumber: true,
    },
  });

  if (expiredActiveSubscriptions.length === 0) {
    return {
      closedCount: 0,
      closedSubscriptionNumbers: [],
    };
  }

  const idsToClose = expiredActiveSubscriptions.map((s) => s.id);
  const closedNumbers = expiredActiveSubscriptions.map((s) => s.subscriptionNumber);

  await prisma.subscription.updateMany({
    where: {
      id: { in: idsToClose },
    },
    data: {
      status: SubscriptionStatus.CLOSED,
    },
  });

  return {
    closedCount: expiredActiveSubscriptions.length,
    closedSubscriptionNumbers: closedNumbers,
  };
}
