import { canTransition, getAllowedActions } from "../subscription-status";
import { SubscriptionStatus } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log("🧪 Running unit tests for subscription-status.ts...");

  const allRulesAllowed = {
    allowPause: true,
    allowEarlyClose: true,
    allowRenewal: true,
  };

  const restrictedRules = {
    allowPause: false,
    allowEarlyClose: false,
    allowRenewal: false,
  };

  // 1. Normal forward lifecycle
  console.log("  Testing normal forward lifecycle...");
  assert(
    canTransition(SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION, allRulesAllowed).allowed,
    "DRAFT -> QUOTATION should be allowed"
  );
  assert(
    canTransition(SubscriptionStatus.QUOTATION, SubscriptionStatus.CONFIRMED, allRulesAllowed).allowed,
    "QUOTATION -> CONFIRMED should be allowed"
  );
  assert(
    canTransition(SubscriptionStatus.CONFIRMED, SubscriptionStatus.ACTIVE, allRulesAllowed).allowed,
    "CONFIRMED -> ACTIVE should be allowed"
  );
  assert(
    canTransition(SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED, allRulesAllowed).allowed,
    "ACTIVE -> CLOSED should be allowed when allowEarlyClose is true"
  );

  // 2. Skipping steps is blocked
  console.log("  Testing invalid forward skips...");
  assert(
    !canTransition(SubscriptionStatus.DRAFT, SubscriptionStatus.ACTIVE, allRulesAllowed).allowed,
    "DRAFT -> ACTIVE directly must be blocked"
  );
  assert(
    !canTransition(SubscriptionStatus.DRAFT, SubscriptionStatus.CONFIRMED, allRulesAllowed).allowed,
    "DRAFT -> CONFIRMED directly must be blocked"
  );
  assert(
    !canTransition(SubscriptionStatus.QUOTATION, SubscriptionStatus.ACTIVE, allRulesAllowed).allowed,
    "QUOTATION -> ACTIVE directly must be blocked"
  );

  // 3. Pause behavior
  console.log("  Testing pause and resume transitions...");
  assert(
    canTransition(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED, allRulesAllowed).allowed,
    "ACTIVE -> PAUSED should be allowed when allowPause is true"
  );
  assert(
    !canTransition(SubscriptionStatus.ACTIVE, SubscriptionStatus.PAUSED, restrictedRules).allowed,
    "ACTIVE -> PAUSED must be blocked when allowPause is false"
  );
  assert(
    !canTransition(SubscriptionStatus.DRAFT, SubscriptionStatus.PAUSED, allRulesAllowed).allowed,
    "DRAFT -> PAUSED must be blocked"
  );
  assert(
    !canTransition(SubscriptionStatus.CONFIRMED, SubscriptionStatus.PAUSED, allRulesAllowed).allowed,
    "CONFIRMED -> PAUSED must be blocked"
  );
  assert(
    canTransition(SubscriptionStatus.PAUSED, SubscriptionStatus.ACTIVE, allRulesAllowed).allowed,
    "PAUSED -> ACTIVE (Resume) should be allowed"
  );
  assert(
    !canTransition(SubscriptionStatus.PAUSED, SubscriptionStatus.QUOTATION, allRulesAllowed).allowed,
    "PAUSED -> QUOTATION must be blocked"
  );

  // 4. Early close behavior
  console.log("  Testing early closure rules...");
  assert(
    !canTransition(SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED, restrictedRules).allowed,
    "ACTIVE -> CLOSED must be blocked when allowEarlyClose is false"
  );
  assert(
    !canTransition(SubscriptionStatus.CONFIRMED, SubscriptionStatus.CLOSED, restrictedRules).allowed,
    "CONFIRMED -> CLOSED must be blocked when allowEarlyClose is false"
  );

  // 5. Renewal behavior
  console.log("  Testing renewal rules...");
  assert(
    canTransition(SubscriptionStatus.ACTIVE, SubscriptionStatus.ACTIVE, allRulesAllowed, true).allowed,
    "ACTIVE -> ACTIVE renewal should be allowed when allowRenewal is true"
  );
  assert(
    !canTransition(SubscriptionStatus.ACTIVE, SubscriptionStatus.ACTIVE, restrictedRules, true).allowed,
    "ACTIVE -> ACTIVE renewal must be blocked when allowRenewal is false"
  );
  assert(
    canTransition(SubscriptionStatus.CLOSED, SubscriptionStatus.ACTIVE, allRulesAllowed, true).allowed,
    "CLOSED -> ACTIVE renewal should be allowed when allowRenewal is true"
  );
  assert(
    !canTransition(SubscriptionStatus.DRAFT, SubscriptionStatus.ACTIVE, allRulesAllowed, true).allowed,
    "DRAFT -> ACTIVE renewal must be blocked"
  );

  // 6. Action lists inspection
  console.log("  Testing action lists...");
  const draftActions = getAllowedActions(SubscriptionStatus.DRAFT, allRulesAllowed);
  assert(draftActions.some((a) => a.targetStatus === SubscriptionStatus.QUOTATION), "Draft has send quotation");

  const activeRestrictedActions = getAllowedActions(SubscriptionStatus.ACTIVE, restrictedRules);
  assert(!activeRestrictedActions.some((a) => a.targetStatus === SubscriptionStatus.PAUSED), "Restricted active has no pause");
  assert(!activeRestrictedActions.some((a) => a.isRenewal), "Restricted active has no renewal");
  assert(!activeRestrictedActions.some((a) => a.targetStatus === SubscriptionStatus.CLOSED), "Restricted active has no close");

  console.log("✅ ALL subscription-status.ts tests passed successfully!");
}

runTests();
