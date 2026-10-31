import {
  PrismaClient,
  Role,
  BillingFrequency,
  SubscriptionStatus,
  DiscountType,
  DiscountAppliesTo,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clean existing data in reverse relation order
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.templateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.taxRule.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();

  // 1. Users (1 Admin, 1 Staff, 3 Customers)
  console.log("Creating users...");
  const hashedPassword = await bcrypt.hash("Brightloop@2026", 10);

  const admin = await prisma.user.create({
    data: {
      name: "System Admin",
      email: "admin@brightloop.com",
      passwordHash: hashedPassword,
      role: Role.ADMIN,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: "Operations Lead",
      email: "staff@brightloop.com",
      passwordHash: hashedPassword,
      role: Role.STAFF,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      name: "Acme Enterprises",
      email: "cust1@acmecorp.com",
      passwordHash: hashedPassword,
      role: Role.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      name: "Globex Logistics",
      email: "cust2@globex.io",
      passwordHash: hashedPassword,
      role: Role.CUSTOMER,
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      name: "Starlight Digital",
      email: "cust3@starlight.dev",
      passwordHash: hashedPassword,
      role: Role.CUSTOMER,
    },
  });

  const customers = [customer1, customer2, customer3];

  // 2. Tax Rules (2 rules)
  console.log("Creating tax rules...");
  const taxGst18 = await prisma.taxRule.create({
    data: {
      name: "GST 18%",
      percentageRate: 18.0,
      isDefault: true,
      isActive: true,
    },
  });

  const taxVat5 = await prisma.taxRule.create({
    data: {
      name: "Standard VAT 5%",
      percentageRate: 5.0,
      isDefault: false,
      isActive: true,
    },
  });

  // 3. Products & Variants (5 products, including Odoo brand variant with +56000 paise surcharge)
  console.log("Creating products and variants...");
  const productErp = await prisma.product.create({
    data: {
      name: "Enterprise ERP Suite",
      type: "SOFTWARE",
      salesPrice: 2500000, // ₹25,000.00
      costPrice: 800000, // ₹8,000.00
      notes: "Modular cloud enterprise resource planning suite.",
      variants: {
        create: [
          {
            name: "Brand: Odoo Edition",
            sku: "ERP-ODOO-01",
            priceSurcharge: 56000, // +₹560.00 surcharge
          },
          {
            name: "Brand: Brightloop Native",
            sku: "ERP-NAT-01",
            priceSurcharge: 0,
          },
        ],
      },
    },
    include: { variants: true },
  });

  const productInvoicing = await prisma.product.create({
    data: {
      name: "Automated Invoicing Engine",
      type: "SOFTWARE",
      salesPrice: 1200000, // ₹12,000.00
      costPrice: 400000, // ₹4,000.00
      notes: "Recurring tax-compliant invoice scheduler and PDF generator.",
      variants: {
        create: [
          {
            name: "Multi-Currency Addon",
            sku: "INV-MC-01",
            priceSurcharge: 25000, // +₹250.00
          },
          {
            name: "Standard Currency",
            sku: "INV-STD-01",
            priceSurcharge: 0,
          },
        ],
      },
    },
    include: { variants: true },
  });

  const productGateway = await prisma.product.create({
    data: {
      name: "Payment Gateway Connector",
      type: "SERVICE",
      salesPrice: 850000, // ₹8,500.00
      costPrice: 300000, // ₹3,000.00
      notes: "Direct integration for UPI, Cards, and NetBanking reconciliations.",
      variants: {
        create: [
          {
            name: "High Volume (>10k tx/mo)",
            sku: "PG-HIGH-01",
            priceSurcharge: 75000, // +₹750.00
          },
          {
            name: "Standard Connector",
            sku: "PG-STD-01",
            priceSurcharge: 0,
          },
        ],
      },
    },
    include: { variants: true },
  });

  const productPortal = await prisma.product.create({
    data: {
      name: "Customer Self-Service Portal",
      type: "SOFTWARE",
      salesPrice: 650000, // ₹6,500.00
      costPrice: 200000, // ₹2,000.00
      notes: "Self-service invoice download and plan renewal portal.",
      variants: {
        create: [
          {
            name: "Custom Whitelabel Domain",
            sku: "PORTAL-WL-01",
            priceSurcharge: 45000, // +₹450.00
          },
          {
            name: "Brightloop Hosted Domain",
            sku: "PORTAL-HST-01",
            priceSurcharge: 0,
          },
        ],
      },
    },
    include: { variants: true },
  });

  const productSupport = await prisma.product.create({
    data: {
      name: "Priority 24/7 SLA Support",
      type: "SERVICE",
      salesPrice: 450000, // ₹4,500.00
      costPrice: 150000, // ₹1,500.00
      notes: "Dedicated technical engineer SLA guarantee.",
      variants: {
        create: [
          {
            name: "Dedicated Account Manager",
            sku: "SUP-DED-01",
            priceSurcharge: 95000, // +₹950.00
          },
          {
            name: "Standard Shared Queue",
            sku: "SUP-STD-01",
            priceSurcharge: 0,
          },
        ],
      },
    },
    include: { variants: true },
  });

  const allProducts = [
    productErp,
    productInvoicing,
    productGateway,
    productPortal,
    productSupport,
  ];

  // 4. Discount Rules (2 rules: 1 subscription percentage, 1 product fixed)
  console.log("Creating discount rules...");
  const discountSub = await prisma.discountRule.create({
    data: {
      code: "WELCOME10",
      name: "10% Off Subscription",
      type: DiscountType.PERCENTAGE,
      appliesTo: DiscountAppliesTo.SUBSCRIPTION,
      value: 10, // 10%
      minAmount: 100000, // ₹1,000.00
      maxUses: 100,
      startDate: new Date("2026-01-01T00:00:00Z"),
      endDate: new Date("2026-12-31T23:59:59Z"),
    },
  });

  const discountProd = await prisma.discountRule.create({
    data: {
      code: "FLAT500",
      name: "₹500 Off Enterprise ERP",
      type: DiscountType.FIXED,
      appliesTo: DiscountAppliesTo.PRODUCT,
      value: 50000, // ₹500.00 in paise
      minAmount: 2000000, // ₹20,000.00
      maxUses: 50,
      productId: productErp.id,
      startDate: new Date("2026-01-01T00:00:00Z"),
      endDate: new Date("2026-12-31T23:59:59Z"),
    },
  });

  // 5. Billing Plans (4 plans: daily, weekly, monthly, yearly)
  console.log("Creating billing plans...");
  const planDaily = await prisma.plan.create({
    data: {
      name: "Daily Flex Plan",
      billingFrequency: BillingFrequency.DAILY,
      basePrice: 4900, // ₹49.00
      minQuantity: 1,
      allowPause: true,
      allowEarlyClose: true,
      allowRenewal: true,
    },
  });

  const planWeekly = await prisma.plan.create({
    data: {
      name: "Weekly Growth Plan",
      billingFrequency: BillingFrequency.WEEKLY,
      basePrice: 29900, // ₹299.00
      minQuantity: 1,
      allowPause: true,
      allowEarlyClose: true,
      allowRenewal: true,
    },
  });

  const planMonthly = await prisma.plan.create({
    data: {
      name: "Monthly Professional Plan",
      billingFrequency: BillingFrequency.MONTHLY,
      basePrice: 119900, // ₹1,199.00
      minQuantity: 1,
      allowPause: true,
      allowEarlyClose: true,
      allowRenewal: true,
    },
  });

  const planYearly = await prisma.plan.create({
    data: {
      name: "Yearly Enterprise Plan",
      billingFrequency: BillingFrequency.YEARLY,
      basePrice: 1199900, // ₹11,999.00
      minQuantity: 5,
      allowPause: true,
      allowEarlyClose: false,
      allowRenewal: true,
    },
  });

  const allPlans = [planDaily, planWeekly, planMonthly, planYearly];

  // 6. Quotation Template (1 template)
  console.log("Creating quotation template...");
  const template = await prisma.quotationTemplate.create({
    data: {
      name: "Standard Enterprise SaaS Onboarding",
      planId: planMonthly.id,
      validityDays: 30,
      terms:
        "Payment due within 15 days of invoice date. Includes 99.9% uptime SLA.",
      lines: {
        create: [
          {
            productId: productErp.id,
            variantId: productErp.variants[0].id, // Odoo Edition
            quantity: 2,
            unitPrice:
              productErp.salesPrice + productErp.variants[0].priceSurcharge, // 2500000 + 56000
          },
          {
            productId: productSupport.id,
            variantId: productSupport.variants[0].id,
            quantity: 1,
            unitPrice:
              productSupport.salesPrice + productSupport.variants[0].priceSurcharge,
          },
        ],
      },
    },
  });

  // 7. 30 Subscriptions with lines and varied statuses
  console.log("Creating 30 subscriptions across different statuses...");
  const statusDistribution: SubscriptionStatus[] = [
    // 4 DRAFT
    SubscriptionStatus.DRAFT,
    SubscriptionStatus.DRAFT,
    SubscriptionStatus.DRAFT,
    SubscriptionStatus.DRAFT,
    // 4 QUOTATION
    SubscriptionStatus.QUOTATION,
    SubscriptionStatus.QUOTATION,
    SubscriptionStatus.QUOTATION,
    SubscriptionStatus.QUOTATION,
    // 5 CONFIRMED
    SubscriptionStatus.CONFIRMED,
    SubscriptionStatus.CONFIRMED,
    SubscriptionStatus.CONFIRMED,
    SubscriptionStatus.CONFIRMED,
    SubscriptionStatus.CONFIRMED,
    // 11 ACTIVE
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.ACTIVE,
    // 3 PAUSED
    SubscriptionStatus.PAUSED,
    SubscriptionStatus.PAUSED,
    SubscriptionStatus.PAUSED,
    // 3 CLOSED
    SubscriptionStatus.CLOSED,
    SubscriptionStatus.CLOSED,
    SubscriptionStatus.CLOSED,
  ];

  for (let i = 0; i < statusDistribution.length; i++) {
    const status = statusDistribution[i];
    const customer = customers[i % customers.length];
    const plan = allPlans[i % allPlans.length];
    const subNumber = `SUB-2026-${String(i + 1).padStart(4, "0")}`;

    const startDate = new Date("2026-10-01T00:00:00Z");
    const expiryDate = new Date("2027-09-30T23:59:59Z");
    const nextBillingDate =
      status === SubscriptionStatus.ACTIVE
        ? new Date("2026-11-01T00:00:00Z")
        : null;

    // Pick 1 or 2 products for subscription lines
    const primaryProd = allProducts[i % allProducts.length];
    const primaryVariant = primaryProd.variants[0] ?? null;
    const unitPrice =
      primaryProd.salesPrice + (primaryVariant?.priceSurcharge ?? 0);
    const quantity = (i % 3) + 1;
    const lineAmount = quantity * unitPrice;

    await prisma.subscription.create({
      data: {
        subscriptionNumber: subNumber,
        customerId: customer.id,
        planId: plan.id,
        status,
        startDate,
        expiryDate,
        nextBillingDate,
        paymentTerms: "Net 15",
        discountRuleId: i % 4 === 0 ? discountSub.id : null,
        notes: `Sample subscription ${i + 1} for ${customer.name}`,
        lines: {
          create: [
            {
              productId: primaryProd.id,
              variantId: primaryVariant?.id ?? null,
              quantity,
              unitPrice,
              taxRate: 18.0,
              lineAmount,
            },
          ],
        },
      },
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log(`- 1 Admin: admin@brightloop.com (Password: Brightloop@2026)`);
  console.log(`- 1 Staff: staff@brightloop.com (Password: Brightloop@2026)`);
  console.log(`- 3 Customers: cust1@acmecorp.com, cust2@globex.io, cust3@starlight.dev`);
  console.log(`- 5 Products with variants (incl. Odoo variant with +56000 paise surcharge)`);
  console.log(`- 4 Plans (Daily, Weekly, Monthly, Yearly)`);
  console.log(`- 2 Tax Rules (GST 18%, VAT 5%)`);
  console.log(`- 2 Discount Rules (WELCOME10, FLAT500)`);
  console.log(`- 1 Quotation Template (${template.name})`);
  console.log(`- 30 Subscriptions created across DRAFT, QUOTATION, CONFIRMED, ACTIVE, PAUSED, CLOSED.`);
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
