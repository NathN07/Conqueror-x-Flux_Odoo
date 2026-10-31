import { PrismaClient, Role, SubscriptionStatus, InvoiceStatus, PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper to chunk arrays for batch createMany
function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Deterministic ID generator so relations can be linked without round trips
function makeCuid(prefix: string, index: number): string {
  return `${prefix}${String(index).padStart(20, "0")}`;
}

async function seedLarge() {
  console.log("==================================================");
  console.log("🚀 STARTING LARGE DATASET SEED FOR PERF BENCHMARK");
  console.log("==================================================");
  const startTime = Date.now();

  const passwordHash = await bcrypt.hash("Brightloop@2026", 10);

  // 1. Fetch available plans and products for realistic relations
  const plans = await prisma.plan.findMany({ select: { id: true, basePrice: true } });
  if (plans.length === 0) {
    throw new Error("No plans found in database. Run 'npm run prisma db seed' first.");
  }

  const products = await prisma.product.findMany({
    select: { id: true, salesPrice: true },
    take: 5,
  });
  if (products.length === 0) {
    throw new Error("No products found in database. Run 'npm run prisma db seed' first.");
  }

  // 2. Create 200 Perf Customers (perf-1@loadtest.local to perf-200@loadtest.local)
  console.log("\n[1/5] Creating 200 identifiable performance customers...");
  const customerCount = 200;
  const customersData = [];
  for (let i = 1; i <= customerCount; i++) {
    customersData.push({
      id: makeCuid("c_perf_", i),
      name: `Perf Customer ${i}`,
      email: `perf-${i}@loadtest.local`,
      passwordHash,
      role: Role.CUSTOMER,
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
    });
  }

  await prisma.user.createMany({
    data: customersData,
    skipDuplicates: true,
  });
  console.log(`✓ 200 Perf Customers seeded (emails: perf-N@loadtest.local)`);

  // 3. Create 5,000 Subscriptions with Lines
  console.log("\n[2/5] Creating 5,000 identifiable subscriptions (PERF-SUB-00001 to PERF-SUB-05000)...");
  const totalSubs = 5000;
  const subscriptionsData = [];
  const subscriptionLinesData = [];

  const statuses: SubscriptionStatus[] = [
    ...Array(3000).fill(SubscriptionStatus.ACTIVE),    // 60% Active
    ...Array(800).fill(SubscriptionStatus.CONFIRMED),  // 16% Confirmed
    ...Array(500).fill(SubscriptionStatus.QUOTATION),  // 10% Quotation
    ...Array(350).fill(SubscriptionStatus.PAUSED),     // 7% Paused
    ...Array(250).fill(SubscriptionStatus.CLOSED),     // 5% Closed
    ...Array(100).fill(SubscriptionStatus.DRAFT),      // 2% Draft
  ];

  const now = new Date();

  for (let i = 1; i <= totalSubs; i++) {
    const subId = makeCuid("s_perf_", i);
    const subNumber = `PERF-SUB-${String(i).padStart(5, "0")}`;
    const customer = customersData[(i - 1) % customerCount];
    const plan = plans[(i - 1) % plans.length];
    const status = statuses[i - 1] || SubscriptionStatus.ACTIVE;

    // Distribute start dates over the past 365 days
    const daysAgo = (i % 360) + 1;
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const nextBillingDate = new Date(now.getTime() + (30 - (daysAgo % 30)) * 24 * 60 * 60 * 1000);

    subscriptionsData.push({
      id: subId,
      subscriptionNumber: subNumber,
      customerId: customer.id,
      planId: plan.id,
      status,
      startDate,
      nextBillingDate,
      paymentTerms: "Net 30",
      notes: "High volume performance test subscription",
      createdAt: startDate,
      updatedAt: startDate,
    });

    // Associated SubscriptionLine
    const product = products[(i - 1) % products.length];
    subscriptionLinesData.push({
      id: makeCuid("sl_perf_", i),
      subscriptionId: subId,
      productId: product.id,
      quantity: 1,
      unitPrice: product.salesPrice,
      taxRate: 18,
      lineAmount: product.salesPrice,
    });
  }

  // Insert subscriptions in batches of 1,000
  for (const batch of chunkArray(subscriptionsData, 1000)) {
    await prisma.subscription.createMany({ data: batch, skipDuplicates: true });
  }
  console.log(`✓ 5,000 Subscriptions inserted via batch createMany`);

  // Insert subscription lines in batches of 1,000
  for (const batch of chunkArray(subscriptionLinesData, 1000)) {
    await prisma.subscriptionLine.createMany({ data: batch, skipDuplicates: true });
  }
  console.log(`✓ 5,000 Subscription Lines inserted via batch createMany`);

  // 4. Create 8,000 Invoices (Mixed statuses: PAID, CONFIRMED, DRAFT, CANCELLED, OVERDUE)
  console.log("\n[3/5] Creating 8,000 identifiable invoices (PERF-INV-00001 to PERF-INV-08000)...");
  const totalInvoices = 8000;
  const invoicesData = [];
  const invoiceLinesData = [];

  // Mixed distribution: 4000 PAID, 2500 CONFIRMED (1200 overdue, 1300 upcoming), 1000 DRAFT, 500 CANCELLED
  for (let i = 1; i <= totalInvoices; i++) {
    const invId = makeCuid("i_perf_", i);
    const invoiceNumber = `PERF-INV-${String(i).padStart(5, "0")}`;

    // Subscriptions mapped cyclically; if i > 5000, cycle through subscriptions with unique periodStart month
    const subIndex = ((i - 1) % totalSubs) + 1;
    const subId = makeCuid("s_perf_", subIndex);
    const customer = customersData[(subIndex - 1) % customerCount];
    const product = products[(i - 1) % products.length];

    let status: InvoiceStatus = InvoiceStatus.PAID;
    let dueDate = new Date();
    let totalAmount = product.salesPrice;
    let amountPaid = 0;

    const cycleOffset = Math.floor((i - 1) / totalSubs); // 0 or 1
    // Guarantee unique (subscriptionId, periodStart)
    const periodStart = new Date(Date.UTC(2026, (i % 12), cycleOffset === 0 ? 1 : 15));
    const periodEnd = new Date(Date.UTC(2026, (i % 12) + 1, cycleOffset === 0 ? 1 : 15));

    if (i <= 4000) {
      // 4,000 PAID
      status = InvoiceStatus.PAID;
      amountPaid = totalAmount;
      dueDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    } else if (i <= 6500) {
      // 2,500 CONFIRMED
      status = InvoiceStatus.CONFIRMED;
      if (i <= 5200) {
        // 1,200 OVERDUE: dueDate 5 to 60 days in past
        const pastDays = (i % 55) + 5;
        dueDate = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
        amountPaid = (i % 3 === 0) ? Math.floor(totalAmount / 2) : 0; // Some partial
      } else {
        // 1,300 UPCOMING: dueDate 5 to 30 days in future
        const futureDays = (i % 25) + 5;
        dueDate = new Date(now.getTime() + futureDays * 24 * 60 * 60 * 1000);
        amountPaid = 0;
      }
    } else if (i <= 7500) {
      // 1,000 DRAFT
      status = InvoiceStatus.DRAFT;
      amountPaid = 0;
      dueDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    } else {
      // 500 CANCELLED
      status = InvoiceStatus.CANCELLED;
      amountPaid = 0;
      dueDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    }

    const issuedDate = new Date(dueDate.getTime() - 15 * 24 * 60 * 60 * 1000);

    invoicesData.push({
      id: invId,
      invoiceNumber,
      subscriptionId: subId,
      customerId: customer.id,
      status,
      periodStart,
      periodEnd,
      subtotal: totalAmount,
      taxAmount: Math.round(totalAmount * 0.18),
      discountAmount: 0,
      totalAmount,
      amountPaid,
      issuedDate,
      dueDate,
      notes: "Performance benchmark invoice",
      createdAt: issuedDate,
      updatedAt: issuedDate,
    });

    invoiceLinesData.push({
      id: makeCuid("il_perf_", i),
      invoiceId: invId,
      productId: product.id,
      description: "Performance license plan",
      quantity: 1,
      unitPrice: product.salesPrice,
      taxAmount: Math.round(product.salesPrice * 0.18),
      discountAmount: 0,
      lineAmount: product.salesPrice,
    });
  }

  // Insert invoices in batches of 1,000
  for (const batch of chunkArray(invoicesData, 1000)) {
    await prisma.invoice.createMany({ data: batch, skipDuplicates: true });
  }
  console.log(`✓ 8,000 Invoices inserted via batch createMany`);

  // Insert invoice lines in batches of 1,000
  for (const batch of chunkArray(invoiceLinesData, 1000)) {
    await prisma.invoiceLine.createMany({ data: batch, skipDuplicates: true });
  }
  console.log(`✓ 8,000 Invoice Lines inserted via batch createMany`);

  // 5. Create 5,000 Payments
  console.log("\n[4/5] Creating 5,000 identifiable payments...");
  const totalPayments = 5000;
  const paymentsData = [];
  const paymentMethods: PaymentMethod[] = [
    PaymentMethod.UPI,
    PaymentMethod.CARD,
    PaymentMethod.BANK_TRANSFER,
    PaymentMethod.NETBANKING,
    PaymentMethod.CASH,
  ];

  for (let i = 1; i <= totalPayments; i++) {
    const paymentId = makeCuid("p_perf_", i);
    // Associate with the paid and partial confirmed invoices
    const targetInvoice = invoicesData[i - 1];
    const amount = targetInvoice.amountPaid > 0 ? targetInvoice.amountPaid : targetInvoice.totalAmount;
    const method = paymentMethods[i % paymentMethods.length];

    const daysAgo = (i % 300) + 1;
    const paymentDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    paymentsData.push({
      id: paymentId,
      invoiceId: targetInvoice.id,
      amount,
      method,
      transactionRef: `PERF-TXN-${String(i).padStart(5, "0")}`,
      paymentDate,
      notes: `Perf payment ${i}`,
      createdAt: paymentDate,
      updatedAt: paymentDate,
    });
  }

  // Insert payments in batches of 1,000
  for (const batch of chunkArray(paymentsData, 1000)) {
    await prisma.payment.createMany({ data: batch, skipDuplicates: true });
  }
  console.log(`✓ 5,000 Payments inserted via batch createMany`);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n==================================================");
  console.log(`🎉 LARGE SEED COMPLETED IN ${durationSec}s!`);
  console.log(`- 200 Perf Customers: perf-N@loadtest.local`);
  console.log(`- 5,000 Perf Subscriptions: PERF-SUB-00001 ... 05000`);
  console.log(`- 8,000 Perf Invoices: PERF-INV-00001 ... 08000`);
  console.log(`- 5,000 Perf Payments: PERF-TXN-00001 ... 05000`);
  console.log("==================================================");
}

seedLarge()
  .catch((e) => {
    console.error("Large seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
