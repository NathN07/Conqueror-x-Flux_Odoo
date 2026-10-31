import { prisma } from "../prisma";
import { executePaymentRecord } from "@/actions/payment.actions";
import { getInvoiceOutstanding } from "../receivables";
import { InvoiceStatus, PaymentMethod, Role, BillingFrequency } from "@prisma/client";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runPaymentTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING PAYMENTS MODULE UNIT & CONCURRENCY TESTS");
  console.log("==================================================");

  // Find or create test customer, product, plan, and subscription
  let customer = await prisma.user.findFirst({ where: { role: Role.CUSTOMER } });
  if (!customer) {
    customer = await prisma.user.create({
      data: {
        name: "Test Customer",
        email: `test-cust-${Date.now()}@brightloop.com`,
        passwordHash: "dummyhash123",
        role: Role.CUSTOMER,
      },
    });
  }

  let plan = await prisma.plan.findFirst();
  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        name: "Test Plan",
        billingFrequency: BillingFrequency.MONTHLY,
        basePrice: 100000,
        minQuantity: 1,
        isActive: true,
      },
    });
  }

  let sub = await prisma.subscription.findFirst({ where: { customerId: customer.id } });
  if (!sub) {
    sub = await prisma.subscription.create({
      data: {
        subscriptionNumber: `SUB-TEST-${Date.now()}`,
        customerId: customer.id,
        planId: plan.id,
        status: "ACTIVE",
        startDate: new Date(),
        nextBillingDate: new Date(),
        paymentTerms: "Immediate",
      },
    });
  }

  const cleanupInvoiceIds: string[] = [];

  try {
    // -------------------------------------------------------------
    // TEST 1: PARTIAL PAYMENT
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Testing Partial Payment...");
    const invoice1 = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-TEST-PARTIAL-${Date.now()}`,
        subscriptionId: sub.id,
        customerId: customer.id,
        status: InvoiceStatus.CONFIRMED,
        periodStart: new Date(),
        periodEnd: new Date(),
        subtotal: 100000, // ₹1,000.00
        totalAmount: 100000,
        amountPaid: 0,
        dueDate: new Date(),
      },
    });
    cleanupInvoiceIds.push(invoice1.id);

    // Initial outstanding check
    assert(
      getInvoiceOutstanding(invoice1) === 100000,
      `Expected outstanding 100000 paise, got ${getInvoiceOutstanding(invoice1)}`
    );

    // Execute partial payment of 40000 paise (₹400.00)
    const res1 = await prisma.$transaction(async (tx) => {
      return await executePaymentRecord(tx, {
        invoiceId: invoice1.id,
        amountInPaise: 40000,
        method: PaymentMethod.UPI,
        transactionRef: "UPI-PARTIAL-01",
        notes: "First partial installment",
      });
    });

    assert(res1.payment.amount === 40000, `Expected payment amount 40000, got ${res1.payment.amount}`);
    assert(res1.invoice.amountPaid === 40000, `Expected invoice amountPaid 40000, got ${res1.invoice.amountPaid}`);
    assert(res1.invoice.status === InvoiceStatus.CONFIRMED, "Invoice must remain CONFIRMED after partial payment");
    assert(
      getInvoiceOutstanding(res1.invoice) === 60000,
      `Expected outstanding 60000 paise, got ${getInvoiceOutstanding(res1.invoice)}`
    );
    console.log("✓ Partial payment recorded successfully: ₹400.00 paid, ₹600.00 remaining, status is CONFIRMED");

    // -------------------------------------------------------------
    // TEST 2: EXACT PAYMENT SETS PAID
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Testing Exact Second Payment Transitions to PAID...");
    const res2 = await prisma.$transaction(async (tx) => {
      return await executePaymentRecord(tx, {
        invoiceId: invoice1.id,
        amountInPaise: 60000, // Exact remaining balance
        method: PaymentMethod.CARD,
        transactionRef: "CARD-FINAL-02",
        notes: "Final settlement",
      });
    });

    assert(res2.invoice.amountPaid === 100000, `Expected invoice amountPaid 100000, got ${res2.invoice.amountPaid}`);
    assert(res2.invoice.status === InvoiceStatus.PAID, `Expected invoice status PAID, got ${res2.invoice.status}`);
    assert(res2.isFullyPaid === true, "isFullyPaid flag must be true");
    assert(
      getInvoiceOutstanding(res2.invoice) === 0,
      `Expected outstanding 0 paise, got ${getInvoiceOutstanding(res2.invoice)}`
    );
    console.log("✓ Exact payment recorded successfully: Invoice transitioned to PAID with ₹0.00 outstanding");

    // -------------------------------------------------------------
    // TEST 3: OVERPAYMENT IS REFUSED
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Testing Overpayment is Refused...");
    const invoice2 = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-TEST-OVERPAY-${Date.now()}`,
        subscriptionId: sub.id,
        customerId: customer.id,
        status: InvoiceStatus.CONFIRMED,
        periodStart: new Date(),
        periodEnd: new Date(),
        subtotal: 50000, // ₹500.00
        totalAmount: 50000,
        amountPaid: 20000, // ₹200.00 already paid (outstanding: 30000 paise)
        dueDate: new Date(),
      },
    });
    cleanupInvoiceIds.push(invoice2.id);

    let overpayErrorCaught = false;
    try {
      await prisma.$transaction(async (tx) => {
        // Outstanding is 30000 paise, attempt to pay 35000 paise
        return await executePaymentRecord(tx, {
          invoiceId: invoice2.id,
          amountInPaise: 35000,
          method: PaymentMethod.CASH,
        });
      });
    } catch (err: any) {
      overpayErrorCaught = true;
      assert(
        err.message.includes("exceeds the outstanding balance"),
        `Unexpected error message: ${err.message}`
      );
      console.log(`✓ Overpayment blocked as expected with error: "${err.message}"`);
    }
    assert(overpayErrorCaught, "Expected overpayment to throw an error!");

    // Verify invoice data was NOT modified
    const untouchedInvoice = await prisma.invoice.findUnique({ where: { id: invoice2.id } });
    assert(
      untouchedInvoice?.amountPaid === 20000,
      `Expected amountPaid to remain 20000, got ${untouchedInvoice?.amountPaid}`
    );
    console.log("✓ Invoice state protected: no balance changes on rejected overpayment");

    // -------------------------------------------------------------
    // TEST 4: CONCURRENCY - TWO PAYMENTS AT ONCE CANNOT OVERPAY
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Testing Concurrent Payments (Race Condition Prevention)...");
    const invoice3 = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-TEST-RACE-${Date.now()}`,
        subscriptionId: sub.id,
        customerId: customer.id,
        status: InvoiceStatus.CONFIRMED,
        periodStart: new Date(),
        periodEnd: new Date(),
        subtotal: 100000, // ₹1,000.00 total
        totalAmount: 100000,
        amountPaid: 0,
        dueDate: new Date(),
      },
    });
    cleanupInvoiceIds.push(invoice3.id);

    // Launch 2 simultaneous payments of 60000 paise each (Combined 120000 > 100000)
    console.log("  Launching 2 simultaneous payments of ₹600 each for a ₹1000 invoice...");
    const p1 = prisma.$transaction(
      async (tx) => {
        return await executePaymentRecord(tx, {
          invoiceId: invoice3.id,
          amountInPaise: 60000,
          method: PaymentMethod.UPI,
          transactionRef: "TXN-CONCURRENT-A",
        });
      },
      { maxWait: 15000, timeout: 30000 }
    );

    const p2 = (async () => {
      // 50ms tick so Tx1 acquires lock first and Tx2 tests concurrent lock wait & rejection
      await new Promise((r) => setTimeout(r, 50));
      return prisma.$transaction(
        async (tx) => {
          return await executePaymentRecord(tx, {
            invoiceId: invoice3.id,
            amountInPaise: 60000,
            method: PaymentMethod.CARD,
            transactionRef: "TXN-CONCURRENT-B",
          });
        },
        { maxWait: 15000, timeout: 30000 }
      );
    })();

    const [resultA, resultB] = await Promise.allSettled([p1, p2]);

    const successes = [resultA, resultB].filter((r) => r.status === "fulfilled");
    const failures = [resultA, resultB].filter((r) => r.status === "rejected");

    console.log(`  Concurrent results: ${successes.length} fulfilled, ${failures.length} rejected`);
    assert(
      successes.length === 1,
      `Expected exactly 1 payment to succeed, but got ${successes.length}`
    );
    assert(
      failures.length === 1,
      `Expected exactly 1 payment to be rejected, but got ${failures.length}`
    );

    const rejectedError = (failures[0] as PromiseRejectedResult).reason;
    console.log(`✓ Second payment rejected with: "${rejectedError.message}"`);

    // Verify DB state after concurrent run
    const finalInvoice = await prisma.invoice.findUnique({
      where: { id: invoice3.id },
      include: { payments: true },
    });

    assert(
      finalInvoice?.amountPaid === 60000,
      `Expected final invoice amountPaid to be 60000, got ${finalInvoice?.amountPaid}`
    );
    assert(
      finalInvoice?.payments.length === 1,
      `Expected exactly 1 payment in database, got ${finalInvoice?.payments.length}`
    );
    assert(
      finalInvoice?.status === InvoiceStatus.CONFIRMED,
      `Expected invoice status to remain CONFIRMED, got ${finalInvoice?.status}`
    );
    console.log("✓ Concurrency test passed: Row-level locking strictly prevented double payment / overpayment!");

    console.log("\n==================================================");
    console.log("🎉 ALL 4 PAYMENT UNIT TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("==================================================");
  } finally {
    // Clean up test invoices and payments
    if (cleanupInvoiceIds.length > 0) {
      await prisma.payment.deleteMany({ where: { invoiceId: { in: cleanupInvoiceIds } } });
      await prisma.invoice.deleteMany({ where: { id: { in: cleanupInvoiceIds } } });
    }
  }
}

runPaymentTests()
  .catch((e) => {
    console.error("Test execution failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
