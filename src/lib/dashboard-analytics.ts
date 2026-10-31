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

  // Execute all independent queries concurrently with Promise.all
  const [
    activeSubsCount,
    totalSubsCount,
    paymentAgg,
    invoiceBilledAgg,
    confirmedUnpaidAgg,
    overdueAgg,
    invoicesByStatusGroup,
    mrrFrequencyRows,
    monthlyPaymentsRaw,
    subscriptionsByStatusRaw,
    overdueInvoices,
    overdueTotalCount,
    recentPayments,
    paymentsTotalCount,
    customersList,
    plansList,
  ] = await Promise.all([
    // Active subscriptions count
    prisma.subscription.count({
      where: { ...subWhere, status: SubscriptionStatus.ACTIVE },
    }),

    // Total subscriptions count
    prisma.subscription.count({ where: subWhere }),

    // Revenue collected (sum of payments)
    prisma.payment.aggregate({
      where: payWhere,
      _sum: { amount: true },
      _count: true,
    }),

    // Total billed (sum of totalAmount on invoices)
    prisma.invoice.aggregate({
      where: invWhere,
      _sum: { totalAmount: true, amountPaid: true },
      _count: true,
    }),

    // Outstanding on CONFIRMED invoices
    prisma.invoice.aggregate({
      where: confirmedUnpaidWhere,
      _sum: { totalAmount: true, amountPaid: true },
    }),

    // Overdue invoices aggregate
    prisma.invoice.aggregate({
      where: overdueWhere,
      _count: true,
      _sum: { totalAmount: true, amountPaid: true },
    }),

    // Invoices distribution by status
    prisma.invoice.groupBy({
      by: ["status"],
      where: invWhere,
      _count: true,
      _sum: { totalAmount: true },
    }),

    // MRR calculation: group line amounts by billing frequency for active subscriptions
    prisma.$queryRaw<Array<{ billingFrequency: BillingFrequency; totalLineAmount: bigint }>>`
      SELECT p."billingFrequency", COALESCE(SUM(sl."lineAmount"), 0)::bigint as "totalLineAmount"
      FROM "Subscription" s
      JOIN "Plan" p ON s."planId" = p.id
      JOIN "SubscriptionLine" sl ON s.id = sl."subscriptionId"
      WHERE s.status = 'ACTIVE'
      ${customerId ? Prisma.sql`AND s."customerId" = ${customerId}` : Prisma.empty}
      ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
      GROUP BY p."billingFrequency"
    `,

    // Monthly revenue collected for last 12 months
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

    // Subscriptions count & normalized monthly run rate by status
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
      LEFT JOIN "Plan" p ON s."planId" = p.id
      LEFT JOIN "SubscriptionLine" sl ON s.id = sl."subscriptionId"
      WHERE 1=1
      ${customerId ? Prisma.sql`AND s."customerId" = ${customerId}` : Prisma.empty}
      ${planId ? Prisma.sql`AND s."planId" = ${planId}` : Prisma.empty}
      GROUP BY s.status
    `,

    // Paginated Overdue Invoices Table (Oldest First)
    prisma.invoice.findMany({
      where: overdueWhere,
      include: {
        customer: { select: { name: true, email: true } },
      },
      orderBy: { dueDate: "asc" },
      skip: (overduePage - 1) * overduePageSize,
      take: overduePageSize,
    }),

    // Total count of overdue invoices
    prisma.invoice.count({ where: overdueWhere }),

    // Paginated Recent Payments Table
    prisma.payment.findMany({
      where: payWhere,
      include: {
        invoice: {
          include: {
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
      skip: (paymentsPage - 1) * paymentsPageSize,
      take: paymentsPageSize,
    }),

    // Total count of payments matching filters
    prisma.payment.count({ where: payWhere }),

    // Dropdown filters data
    prisma.user.findMany({
      where: { role: Role.CUSTOMER },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.plan.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Compute MRR from frequency rows:
  // daily * 30, weekly * 52 / 12, monthly * 1, yearly / 12
  let mrrPaise = 0;
  for (const row of mrrFrequencyRows) {
    const lineAmt = Number(row.totalLineAmount);
    switch (row.billingFrequency) {
      case BillingFrequency.DAILY:
        mrrPaise += lineAmt * 30;
        break;
      case BillingFrequency.WEEKLY:
        mrrPaise += Math.round((lineAmt * 52) / 12);
        break;
      case BillingFrequency.MONTHLY:
        mrrPaise += lineAmt;
        break;
      case BillingFrequency.YEARLY:
        mrrPaise += Math.round(lineAmt / 12);
        break;
    }
  }

  // Revenue collected
  const revenueCollectedPaise = paymentAgg._sum.amount || 0;

  // Total Billed
  const totalBilledPaise = invoiceBilledAgg._sum.totalAmount || 0;

  // Outstanding amount (on confirmed invoices)
  const outstandingPaise =
    (confirmedUnpaidAgg._sum.totalAmount || 0) - (confirmedUnpaidAgg._sum.amountPaid || 0);

  // Overdue count and amount
  const overdueInvoiceCount = overdueAgg._count;
  const overdueAmountPaise =
    (overdueAgg._sum.totalAmount || 0) - (overdueAgg._sum.amountPaid || 0);

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

  // Format Invoices Distribution Chart
  const invoicesDistribution: Array<{
    name: string;
    count: number;
    color: string;
    totalPaise: number;
  }> = invoicesByStatusGroup.map((item) => ({
    name: String(item.status),
    count: item._count,
    color: "",
    totalPaise: item._sum.totalAmount || 0,
  }));

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

  // Format Subscriptions Distribution Chart
  const subscriptionsDistribution = subscriptionsByStatusRaw.map((item) => ({
    name: item.status,
    count: Number(item.count),
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
  const formattedSubStatusSummary = subscriptionsByStatusRaw.map((row) => ({
    status: row.status,
    count: Number(row.count),
    percentage: totalSubsCount > 0 ? (Number(row.count) / totalSubsCount) * 100 : 0,
    monthlyValue: Number(row.monthlyValue),
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
