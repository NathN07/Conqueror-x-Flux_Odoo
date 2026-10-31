import { prisma } from "@/lib/prisma";
import {
  Role,
  InvoiceStatus,
  SubscriptionStatus,
  PaymentMethod,
  BillingFrequency,
  Prisma,
} from "@prisma/client";
import { formatUtcDate } from "@/lib/dates";

export interface DashboardFilterParams {
  startDate?: string;
  endDate?: string;
  status?: string;
  planId?: string;
  customerId?: string;
  view?: string;
  overduePage?: string;
  paymentsPage?: string;
}

export async function getDashboardFinancialMetrics(filters: DashboardFilterParams) {
  const now = new Date();

  const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
  let endDate = filters.endDate ? new Date(filters.endDate) : undefined;
  if (endDate) {
    endDate.setUTCHours(23, 59, 59, 999);
  }

  const customerId = filters.customerId && filters.customerId !== "ALL" ? filters.customerId : undefined;
  const planId = filters.planId && filters.planId !== "ALL" ? filters.planId : undefined;
  const statusFilter =
    filters.status && filters.status !== "ALL"
      ? (filters.status.toUpperCase() as SubscriptionStatus)
      : undefined;

  // 1. Subscription Where Clause
  const subWhere: Prisma.SubscriptionWhereInput = {};
  if (customerId) subWhere.customerId = customerId;
  if (planId) subWhere.planId = planId;
  if (statusFilter) subWhere.status = statusFilter;
  if (startDate || endDate) {
    subWhere.startDate = {};
    if (startDate) subWhere.startDate.gte = startDate;
    if (endDate) subWhere.startDate.lte = endDate;
  }

  // 2. Invoice Where Clause
  const invWhere: Prisma.InvoiceWhereInput = {
    status: { not: InvoiceStatus.CANCELLED },
  };
  if (customerId) invWhere.customerId = customerId;
  if (planId) invWhere.subscription = { planId };
  if (startDate || endDate) {
    invWhere.issuedDate = {};
    if (startDate) invWhere.issuedDate.gte = startDate;
    if (endDate) invWhere.issuedDate.lte = endDate;
  }

  // 3. Payment Where Clause
  const payWhere: Prisma.PaymentWhereInput = {};
  if (startDate || endDate) {
    payWhere.paymentDate = {};
    if (startDate) payWhere.paymentDate.gte = startDate;
    if (endDate) payWhere.paymentDate.lte = endDate;
  }
  if (customerId || planId) {
    payWhere.invoice = {};
    if (customerId) payWhere.invoice.customerId = customerId;
    if (planId) payWhere.invoice.subscription = { planId };
  }

  // Overdue Invoice Where Clause
  const overdueWhere: Prisma.InvoiceWhereInput = {
    status: InvoiceStatus.CONFIRMED,
    dueDate: { lt: now },
  };
  if (customerId) overdueWhere.customerId = customerId;
  if (planId) overdueWhere.subscription = { planId };
  if (startDate || endDate) {
    overdueWhere.issuedDate = {};
    if (startDate) overdueWhere.issuedDate.gte = startDate;
    if (endDate) overdueWhere.issuedDate.lte = endDate;
  }

  // Confirmed Unpaid Invoice Where Clause (for Outstanding calculation)
  const confirmedUnpaidWhere: Prisma.InvoiceWhereInput = {
    status: InvoiceStatus.CONFIRMED,
  };
  if (customerId) confirmedUnpaidWhere.customerId = customerId;
  if (planId) confirmedUnpaidWhere.subscription = { planId };
  if (startDate || endDate) {
    confirmedUnpaidWhere.issuedDate = {};
    if (startDate) confirmedUnpaidWhere.issuedDate.gte = startDate;
    if (endDate) confirmedUnpaidWhere.issuedDate.lte = endDate;
  }

  // Pagination for Overdue & Payments tables
  const overduePage = Math.max(1, parseInt(filters.overduePage || "1", 10));
  const overduePageSize = 5;

  const paymentsPage = Math.max(1, parseInt(filters.paymentsPage || "1", 10));
  const paymentsPageSize = 5;

  // 12 months ago timestamp for monthly chart
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  // Execute consolidated independent queries concurrently
  const [
    paymentAgg,
    invoiceMetricsRaw,
    monthlyPaymentsRaw,
    subscriptionsMonthlyValueRaw,
    overdueInvoices,
    recentPayments,
    customersList,
    plansList,
  ] = await Promise.all([
    // 1. Revenue collected (sum of payments)
    prisma.payment.aggregate({
      where: payWhere,
      _sum: { amount: true },
      _count: true,
    }),

    // 2. Consolidated Invoice aggregates & status breakdown in ONE single table scan
    prisma.$queryRaw<
      Array<{
        total_billed: bigint;
        outstanding: bigint;
        overdue_count: number;
        overdue_amount: bigint;
        draft_count: number;
        draft_total: bigint;
        confirmed_count: number;
        confirmed_total: bigint;
        paid_count: number;
        paid_total: bigint;
        cancelled_count: number;
        cancelled_total: bigint;
      }>
    >`
      SELECT
        COALESCE(SUM(CASE WHEN i.status != 'CANCELLED' THEN i."totalAmount" ELSE 0 END), 0)::bigint as total_billed,
        COALESCE(SUM(CASE WHEN i.status = 'CONFIRMED' THEN GREATEST(0, i."totalAmount" - i."amountPaid") ELSE 0 END), 0)::bigint as outstanding,
        COUNT(CASE WHEN i.status = 'CONFIRMED' AND i."dueDate" < ${now} THEN 1 END)::int as overdue_count,
        COALESCE(SUM(CASE WHEN i.status = 'CONFIRMED' AND i."dueDate" < ${now} THEN GREATEST(0, i."totalAmount" - i."amountPaid") ELSE 0 END), 0)::bigint as overdue_amount,
        COUNT(CASE WHEN i.status = 'DRAFT' THEN 1 END)::int as draft_count,
        COALESCE(SUM(CASE WHEN i.status = 'DRAFT' THEN i."totalAmount" ELSE 0 END), 0)::bigint as draft_total,
        COUNT(CASE WHEN i.status = 'CONFIRMED' THEN 1 END)::int as confirmed_count,
        COALESCE(SUM(CASE WHEN i.status = 'CONFIRMED' THEN i."totalAmount" ELSE 0 END), 0)::bigint as confirmed_total,
        COUNT(CASE WHEN i.status = 'PAID' THEN 1 END)::int as paid_count,
        COALESCE(SUM(CASE WHEN i.status = 'PAID' THEN i."totalAmount" ELSE 0 END), 0)::bigint as paid_total,
        COUNT(CASE WHEN i.status = 'CANCELLED' THEN 1 END)::int as cancelled_count,
        COALESCE(SUM(CASE WHEN i.status = 'CANCELLED' THEN i."totalAmount" ELSE 0 END), 0)::bigint as cancelled_total
      FROM "Invoice" i
      ${planId ? Prisma.sql`JOIN "Subscription" s ON i."subscriptionId" = s.id` : Prisma.empty}
      WHERE 1=1
      ${customerId ? Prisma.sql`AND i."customerId" = ${customerId}` : Prisma.empty}
      ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
      ${startDate ? Prisma.sql`AND i."issuedDate" >= ${startDate}` : Prisma.empty}
      ${endDate ? Prisma.sql`AND i."issuedDate" <= ${endDate}` : Prisma.empty}
    `,

    // 3. Monthly revenue collected for last 12 months
    prisma.$queryRaw<Array<{ month: string; totalAmount: bigint }>>`
      SELECT
        TO_CHAR(p."paymentDate", 'YYYY-MM') as month,
        COALESCE(SUM(p.amount), 0)::bigint as "totalAmount"
      FROM "Payment" p
      ${
        customerId || planId
          ? Prisma.sql`
              JOIN "Invoice" i ON p."invoiceId" = i.id
              ${planId ? Prisma.sql`JOIN "Subscription" sub ON i."subscriptionId" = sub.id` : Prisma.empty}
              WHERE p."paymentDate" >= ${twelveMonthsAgo}
              ${customerId ? Prisma.sql`AND i."customerId" = ${customerId}` : Prisma.empty}
              ${planId ? Prisma.sql`AND sub."planId" = ${planId}` : Prisma.empty}
            `
          : Prisma.sql`WHERE p."paymentDate" >= ${twelveMonthsAgo}`
      }
      GROUP BY TO_CHAR(p."paymentDate", 'YYYY-MM')
      ORDER BY month ASC
    `,

    // 4. Subscriptions count and monthly run rate by status in ONE query
    prisma.$queryRaw<Array<{ status: SubscriptionStatus; count: number; monthlyValue: bigint }>>`
      SELECT
        s.status,
        COUNT(DISTINCT s.id)::int as count,
        COALESCE(SUM(
          CASE
            WHEN p."billingFrequency" = 'DAILY' THEN sl."lineAmount" * 30
            WHEN p."billingFrequency" = 'WEEKLY' THEN ROUND((sl."lineAmount" * 52) / 12)
            WHEN p."billingFrequency" = 'MONTHLY' THEN sl."lineAmount"
            WHEN p."billingFrequency" = 'YEARLY' THEN ROUND(sl."lineAmount" / 12)
            ELSE sl."lineAmount"
          END
        ), 0)::bigint as "monthlyValue"
      FROM "Subscription" s
      JOIN "Plan" p ON s."planId" = p.id
      JOIN "SubscriptionLine" sl ON s.id = sl."subscriptionId"
      WHERE 1=1
      ${statusFilter ? Prisma.sql`AND s.status = ${statusFilter}::"SubscriptionStatus"` : Prisma.empty}
      ${customerId ? Prisma.sql`AND s."customerId" = ${customerId}` : Prisma.empty}
      ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
      GROUP BY s.status
    `,

    // 5. Paginated Overdue Invoices Table (Oldest First)
    prisma.invoice.findMany({
      where: overdueWhere,
      select: {
        id: true,
        invoiceNumber: true,
        dueDate: true,
        totalAmount: true,
        amountPaid: true,
        customer: { select: { name: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
      skip: (overduePage - 1) * overduePageSize,
      take: overduePageSize,
    }),

    // 6. Paginated Recent Payments Table
    prisma.payment.findMany({
      where: payWhere,
      select: {
        id: true,
        paymentDate: true,
        amount: true,
        method: true,
        transactionRef: true,
        notes: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
      skip: (paymentsPage - 1) * paymentsPageSize,
      take: paymentsPageSize,
    }),

    // 7. Dropdown filters data (bounded)
    prisma.user.findMany({
      where: { role: Role.CUSTOMER },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.plan.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Derived metrics from consolidated query results
  const metrics = invoiceMetricsRaw[0];

  const activeSubsCount =
    subscriptionsMonthlyValueRaw.find((s) => s.status === SubscriptionStatus.ACTIVE)?.count || 0;
  const totalSubsCount = subscriptionsMonthlyValueRaw.reduce((acc, s) => acc + s.count, 0);

  const revenueCollectedPaise = paymentAgg._sum.amount || 0;
  const paymentsTotalCount = paymentAgg._count;

  const totalBilledPaise = Number(metrics?.total_billed || 0);
  const outstandingPaise = Number(metrics?.outstanding || 0);
  const overdueInvoiceCount = Number(metrics?.overdue_count || 0);
  const overdueAmountPaise = Number(metrics?.overdue_amount || 0);
  const overdueTotalCount = overdueInvoiceCount;

  // Normalized MRR directly from Active status monthly run rate
  const mrrPaise = Number(
    subscriptionsMonthlyValueRaw.find((s) => s.status === SubscriptionStatus.ACTIVE)?.monthlyValue || 0
  );

  // Format 12 Months Chart Data (ensure all 12 months exist even if 0 revenue)
  const monthlyRevenueMap = new Map<string, number>();
  for (const item of monthlyPaymentsRaw) {
    monthlyRevenueMap.set(item.month, Number(item.totalAmount));
  }

  const monthlyRevenueChartData = [];
  const monthCursor = new Date(twelveMonthsAgo);
  for (let i = 0; i < 12; i++) {
    const key = `${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, "0")}`;
    const label = monthCursor.toLocaleString("en-US", { month: "short", year: "2-digit" });
    monthlyRevenueChartData.push({
      month: key,
      label,
      revenuePaise: monthlyRevenueMap.get(key) || 0,
    });
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  // Format Invoices Distribution Chart directly from consolidated metrics scan
  const invoicesDistribution: Array<{
    name: string;
    count: number;
    color: string;
    totalPaise: number;
  }> = [
    { name: "DRAFT", count: metrics?.draft_count || 0, color: "", totalPaise: Number(metrics?.draft_total || 0) },
    { name: "CONFIRMED", count: metrics?.confirmed_count || 0, color: "", totalPaise: Number(metrics?.confirmed_total || 0) },
    { name: "PAID", count: metrics?.paid_count || 0, color: "", totalPaise: Number(metrics?.paid_total || 0) },
    { name: "CANCELLED", count: metrics?.cancelled_count || 0, color: "", totalPaise: Number(metrics?.cancelled_total || 0) },
  ].filter((item) => item.count > 0);

  // Add dynamically computed OVERDUE slice to invoices distribution if there are overdue invoices
  if (overdueInvoiceCount > 0) {
    // If overdue invoices exist, show OVERDUE slice
    invoicesDistribution.push({
      name: "OVERDUE",
      count: overdueInvoiceCount,
      color: "#f59e0b",
      totalPaise: overdueAmountPaise,
    });
  }

  // Format Subscriptions Distribution Chart directly from single run-rate query
  const subscriptionsDistribution = subscriptionsMonthlyValueRaw.map((item) => ({
    name: item.status,
    count: item.count,
    color: "",
    totalPaise: Number(item.monthlyValue),
  }));

  // Format Table A: Overdue Invoices
  const formattedOverdueInvoices = overdueInvoices.map((inv) => {
    const diffMs = now.getTime() - new Date(inv.dueDate).getTime();
    const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.name,
      customerEmail: inv.customer.email,
      dueDate: inv.dueDate,
      daysOverdue,
      totalAmount: inv.totalAmount,
      amountPaid: inv.amountPaid,
      outstanding: Math.max(0, inv.totalAmount - inv.amountPaid),
    };
  });

  // Format Table B: Recent Payments
  const formattedRecentPayments = recentPayments.map((p) => ({
    id: p.id,
    invoiceId: p.invoice.id,
    invoiceNumber: p.invoice.invoiceNumber,
    customerName: p.invoice.customer.name,
    amount: p.amount,
    method: p.method,
    paymentDate: p.paymentDate,
    transactionRef: p.transactionRef,
    notes: p.notes,
  }));

  // Format Table C: Subscriptions Summary by Status
  const formattedSubStatusSummary = subscriptionsDistribution.map((row) => ({
    status: row.name as SubscriptionStatus,
    count: row.count,
    percentage: totalSubsCount > 0 ? (row.count / totalSubsCount) * 100 : 0,
    monthlyValue: row.totalPaise,
  }));

  return {
    summaryCards: {
      activeSubscriptions: activeSubsCount,
      mrrPaise,
      revenueCollectedPaise,
      totalBilledPaise,
      outstandingPaise: Math.max(0, outstandingPaise),
      overdueInvoiceCount,
      overdueAmountPaise: Math.max(0, overdueAmountPaise),
    },
    charts: {
      monthlyRevenue: monthlyRevenueChartData,
      invoicesDistribution,
      subscriptionsDistribution,
    },
    tables: {
      overdueInvoices: formattedOverdueInvoices,
      overdueTotalCount,
      overduePage,
      overduePageSize,
      recentPayments: formattedRecentPayments,
      paymentsTotalCount,
      paymentsPage,
      paymentsPageSize,
      subscriptionStatusSummary: formattedSubStatusSummary,
    },
    filterOptions: {
      customers: customersList,
      plans: plansList,
    },
  };
}
