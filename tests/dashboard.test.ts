import { prisma } from "../src/lib/prisma";
import { getDashboardFinancialMetrics } from "../src/lib/dashboard-analytics";
import { BillingFrequency, InvoiceStatus, SubscriptionStatus, Role } from "@prisma/client";
import { formatPaiseToInr } from "../src/lib/money";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runDashboardTests() {
  console.log("==================================================");
  console.log("📊 RUNNING FINANCE DASHBOARD METRICS UNIT TESTS");
  console.log("==================================================");

  // 1. Test Base Dashboard Metrics
  console.log("\n[TEST 1] Testing Global Financial Metrics Aggregation...");
  const metrics = await getDashboardFinancialMetrics({});

  console.log("  Active Subscriptions:", metrics.summaryCards.activeSubscriptions);
  console.log("  MRR (in paise):", metrics.summaryCards.mrrPaise, `(${formatPaiseToInr(metrics.summaryCards.mrrPaise)})`);
  console.log("  Revenue Collected:", formatPaiseToInr(metrics.summaryCards.revenueCollectedPaise));
  console.log("  Total Invoiced:", formatPaiseToInr(metrics.summaryCards.totalBilledPaise));
  console.log("  Outstanding Receivables:", formatPaiseToInr(metrics.summaryCards.outstandingPaise));
  console.log("  Overdue Count:", metrics.summaryCards.overdueInvoiceCount);
  console.log("  Overdue Amount:", formatPaiseToInr(metrics.summaryCards.overdueAmountPaise));

  assert(typeof metrics.summaryCards.activeSubscriptions === "number", "activeSubscriptions must be number");
  assert(metrics.summaryCards.activeSubscriptions >= 0, "activeSubscriptions must be >= 0");
  assert(metrics.summaryCards.mrrPaise >= 0, "MRR must be non-negative");
  assert(metrics.summaryCards.revenueCollectedPaise >= 0, "Revenue collected must be >= 0");
  assert(metrics.summaryCards.totalBilledPaise >= 0, "Total billed must be >= 0");
  assert(metrics.summaryCards.outstandingPaise >= 0, "Outstanding must be >= 0");
  assert(metrics.summaryCards.overdueInvoiceCount >= 0, "Overdue count must be >= 0");
  assert(metrics.summaryCards.overdueAmountPaise >= 0, "Overdue amount must be >= 0");
  console.log("✓ Base financial metrics aggregation verified successfully");

  // 2. Test 12-Month Revenue Trend
  console.log("\n[TEST 2] Testing 12-Month Rolling Revenue Trend...");
  assert(metrics.charts.monthlyRevenue.length === 12, "Must return exactly 12 monthly data points");
  for (const point of metrics.charts.monthlyRevenue) {
    assert(Boolean(point.month), "Month key must be defined");
    assert(Boolean(point.label), "Month label must be defined");
    assert(point.revenuePaise >= 0, "Monthly revenue must be non-negative");
  }
  console.log("✓ 12-month rolling revenue chart structure verified");

  // 3. Test Invoices & Subscriptions Distribution
  console.log("\n[TEST 3] Testing Portfolio Status Distributions...");
  assert(Array.isArray(metrics.charts.invoicesDistribution), "Invoices distribution must be an array");
  assert(Array.isArray(metrics.charts.subscriptionsDistribution), "Subscriptions distribution must be an array");
  console.log(`  Found ${metrics.charts.invoicesDistribution.length} invoice status slices.`);
  console.log(`  Found ${metrics.charts.subscriptionsDistribution.length} subscription status slices.`);
  console.log("✓ Status distributions verified");

  // 4. Test Overdue & Payments Tables Structure
  console.log("\n[TEST 4] Testing Table Ledgers & Overdue Sorting...");
  assert(Array.isArray(metrics.tables.overdueInvoices), "Overdue invoices must be an array");
  assert(Array.isArray(metrics.tables.recentPayments), "Recent payments must be an array");
  assert(Array.isArray(metrics.tables.subscriptionStatusSummary), "Subscription status summary must be an array");

  // Verify overdue invoices are ordered oldest first (ascending due date)
  if (metrics.tables.overdueInvoices.length > 1) {
    for (let i = 0; i < metrics.tables.overdueInvoices.length - 1; i++) {
      const currentDue = new Date(metrics.tables.overdueInvoices[i].dueDate).getTime();
      const nextDue = new Date(metrics.tables.overdueInvoices[i + 1].dueDate).getTime();
      assert(currentDue <= nextDue, "Overdue invoices must be sorted oldest first (dueDate ascending)");
    }
    console.log("✓ Overdue invoices correctly verified to be sorted oldest first");
  }

  // 5. Test Filters Isolation (e.g. by customer or status)
  console.log("\n[TEST 5] Testing Filter Scoping...");
  const customer = await prisma.user.findFirst({ where: { role: Role.CUSTOMER } });
  if (customer) {
    const customerMetrics = await getDashboardFinancialMetrics({ customerId: customer.id });
    console.log(`  Filtered for customer: ${customer.name}`);
    console.log(`  Customer active subs: ${customerMetrics.summaryCards.activeSubscriptions}`);
    assert(
      customerMetrics.summaryCards.activeSubscriptions <= metrics.summaryCards.activeSubscriptions,
      "Customer active subs cannot exceed total active subs"
    );
    console.log("✓ Filter scoping verified");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL DASHBOARD METRIC TESTS PASSED! 🎉");
  console.log("==================================================");
}

runDashboardTests()
  .catch((e) => {
    console.error("Dashboard tests failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
