import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanLargeSeed() {
  console.log("==================================================");
  console.log("🧹 CLEANING UP LARGE PERFORMANCE SEED DATA");
  console.log("==================================================");
  const startTime = Date.now();

  // 1. Delete Performance Payments
  console.log("[1/6] Deleting performance payments...");
  const delPayments = await prisma.payment.deleteMany({
    where: {
      OR: [
        { transactionRef: { startsWith: "PERF-" } },
        { notes: { startsWith: "Perf payment" } },
      ],
    },
  });
  console.log(`✓ Deleted ${delPayments.count} performance payments`);

  // 2. Delete Performance Invoice Lines
  console.log("[2/6] Deleting performance invoice lines...");
  const delInvoiceLines = await prisma.invoiceLine.deleteMany({
    where: {
      invoice: {
        invoiceNumber: { startsWith: "PERF-" },
      },
    },
  });
  console.log(`✓ Deleted ${delInvoiceLines.count} performance invoice lines`);

  // 3. Delete Performance Invoices
  console.log("[3/6] Deleting performance invoices...");
  const delInvoices = await prisma.invoice.deleteMany({
    where: {
      invoiceNumber: { startsWith: "PERF-" },
    },
  });
  console.log(`✓ Deleted ${delInvoices.count} performance invoices`);

  // 4. Delete Performance Subscription Lines
  console.log("[4/6] Deleting performance subscription lines...");
  const delSubLines = await prisma.subscriptionLine.deleteMany({
    where: {
      subscription: {
        subscriptionNumber: { startsWith: "PERF-" },
      },
    },
  });
  console.log(`✓ Deleted ${delSubLines.count} performance subscription lines`);

  // 5. Delete Performance Subscriptions
  console.log("[5/6] Deleting performance subscriptions...");
  const delSubs = await prisma.subscription.deleteMany({
    where: {
      subscriptionNumber: { startsWith: "PERF-" },
    },
  });
  console.log(`✓ Deleted ${delSubs.count} performance subscriptions`);

  // 6. Delete Performance Customers
  console.log("[6/6] Deleting performance loadtest customers...");
  const delUsers = await prisma.user.deleteMany({
    where: {
      email: { endsWith: "@loadtest.local" },
    },
  });
  console.log(`✓ Deleted ${delUsers.count} performance customers`);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log("\n==================================================");
  console.log(`✨ CLEANUP COMPLETED IN ${durationSec}s!`);
  console.log("Normal demo data (admin, staff, standard demo users) is intact.");
  console.log("==================================================");
}

cleanLargeSeed()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
