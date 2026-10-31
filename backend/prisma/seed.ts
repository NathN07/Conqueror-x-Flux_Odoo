import { PrismaClient, Role, BillingPeriod, PlanStatus, DiscountType, DiscountAppliesTo } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Starting Brightloop Database Seeding...');

  // Clean up existing data in reverse order of foreign keys
  await prisma.payment.deleteMany();
  await prisma.invoiceDiscount.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionStatusHistory.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.quotationTemplateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.counter.deleteMany();

  // Initialize counters for sequential numbers
  await prisma.counter.createMany({
    data: [
      { key: 'SUBSCRIPTION_SEQ', value: 0 },
      { key: 'INVOICE_SEQ', value: 0 },
    ],
  });

  // Passwords
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@123456', 10);
  const customerPasswordHash = await bcrypt.hash('Customer@123456', 10);

  // 1. Users: 1 Admin, 1 Staff, 2 Customers
  const admin = await prisma.user.create({
    data: {
      email: 'admin@brightloop.io',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      name: 'System Administrator',
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: 'staff@brightloop.io',
      passwordHash: staffPasswordHash,
      role: Role.STAFF,
      name: 'Sarah Staff (Operations)',
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer1@acme.corp',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      name: 'Acme Corporation',
      customerProfile: {
        create: {
          phone: '+1-555-0199',
          company: 'Acme Corp',
          address: '123 Innovation Way, Suite 400, San Francisco, CA',
        },
      },
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'customer2@globex.com',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      name: 'Globex Industries',
      customerProfile: {
        create: {
          phone: '+1-555-0188',
          company: 'Globex Ind',
          address: '456 Enterprise Blvd, Austin, TX',
        },
      },
    },
  });

  console.log('✅ Seeded Users: 1 Admin, 1 Staff, 2 Customers');

  // 2. Products with Variants (brand Odoo = +560)
  const product1 = await prisma.product.create({
    data: {
      name: 'Enterprise ERP Suite',
      type: 'service',
      salesPrice: 1200.00,
      costPrice: 400.00,
      notes: 'Integrated financial, inventory, and operations management',
      variants: {
        create: [
          { attribute: 'Brand', value: 'Odoo', extraPrice: 560.00 },
          { attribute: 'Tier', value: 'Standard', extraPrice: 0.00 },
          { attribute: 'Tier', value: 'Premium', extraPrice: 350.00 },
        ],
      },
    },
    include: { variants: true },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Cloud CRM Pro',
      type: 'service',
      salesPrice: 800.00,
      costPrice: 250.00,
      notes: 'Customer pipeline, marketing automation, and sales intelligence',
      variants: {
        create: [
          { attribute: 'Brand', value: 'Odoo', extraPrice: 560.00 },
          { attribute: 'Support', value: 'Standard SLA', extraPrice: 0.00 },
          { attribute: 'Support', value: 'Gold 24/7 SLA', extraPrice: 200.00 },
        ],
      },
    },
    include: { variants: true },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Brightloop Analytics & BI Add-on',
      type: 'service',
      salesPrice: 450.00,
      costPrice: 120.00,
      notes: 'Real-time telemetry and revenue analytics dashboard',
      variants: {
        create: [
          { attribute: 'Capacity', value: '50k Events/mo', extraPrice: 0.00 },
          { attribute: 'Capacity', value: '500k Events/mo', extraPrice: 250.00 },
        ],
      },
    },
    include: { variants: true },
  });

  console.log('✅ Seeded 3 Products with Variants (Brand Odoo = +560.00)');

  // 3. Plans: 2 Plans
  const planMonthly = await prisma.plan.create({
    data: {
      name: 'Growth Professional Monthly',
      price: 1500.00,
      billingPeriod: BillingPeriod.MONTHLY,
      minQuantity: 1,
      autoClose: false,
      allowEarlyClose: true,
      allowPause: true,
      allowRenew: true,
      status: PlanStatus.ACTIVE,
    },
  });

  const planYearly = await prisma.plan.create({
    data: {
      name: 'Enterprise Scale Annual',
      price: 15000.00,
      billingPeriod: BillingPeriod.YEARLY,
      minQuantity: 1,
      autoClose: false,
      allowEarlyClose: true,
      allowPause: true,
      allowRenew: true,
      status: PlanStatus.ACTIVE,
    },
  });

  console.log('✅ Seeded 2 Plans (Monthly & Annual)');

  // 4. Taxes: 2 Taxes
  const taxStandard = await prisma.tax.create({
    data: {
      name: 'Standard GST / VAT (18%)',
      percent: 18.00,
      active: true,
    },
  });

  const taxReduced = await prisma.tax.create({
    data: {
      name: 'Reduced Tech Services Tax (5%)',
      percent: 5.00,
      active: true,
    },
  });

  console.log('✅ Seeded 2 Taxes (18% and 5%)');

  // 5. Discount: 1 Discount
  const discount1 = await prisma.discount.create({
    data: {
      name: 'SPRING2026 - 15% Off Subscriptions',
      type: DiscountType.PERCENT,
      value: 15.00,
      minPurchase: 500.00,
      minQuantity: 1,
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-12-31T23:59:59Z'),
      usageLimit: 500,
      usedCount: 0,
      appliesTo: DiscountAppliesTo.SUBSCRIPTION,
    },
  });

  console.log('✅ Seeded 1 Discount (15% off)');

  console.log('\n🎉 Database Seed Completed Successfully!');
  console.log('----------------------------------------------------');
  console.log('Admin Account:    admin@brightloop.io   / Admin@123456');
  console.log('Staff Account:    staff@brightloop.io   / Staff@123456');
  console.log('Customer 1:       customer1@acme.corp   / Customer@123456');
  console.log('Customer 2:       customer2@globex.com  / Customer@123456');
  console.log('----------------------------------------------------');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Seeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
