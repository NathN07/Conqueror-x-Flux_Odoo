import { applyDiscounts, calculateTax, type LineForPricing, type DiscountForPricing } from "../pricing";
import { DiscountType, DiscountAppliesTo } from "@prisma/client";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function runPricingTests() {
  console.log("🧪 Running unit tests for pricing.ts...");

  const lines: LineForPricing[] = [
    {
      productId: "prod-erp",
      quantity: 2,
      unitPrice: 2500000, // ₹25,000.00
      lineAmount: 5000000, // ₹50,000.00 (5,000,000 paise)
    },
    {
      productId: "prod-support",
      quantity: 1,
      unitPrice: 450000, // ₹4,500.00
      lineAmount: 450000, // 450,000 paise
    },
  ];
  // Total Subtotal = 5,450,000 paise (₹54,500.00)

  const today = new Date("2026-06-01T00:00:00Z");

  // 1. Test Subscription Percentage Discount (e.g. 10%)
  console.log("  Testing 10% subscription discount...");
  const subPercentDiscount: DiscountForPricing = {
    id: "disc-1",
    code: "WELCOME10",
    name: "10% Off",
    type: DiscountType.PERCENTAGE,
    appliesTo: DiscountAppliesTo.SUBSCRIPTION,
    value: 10,
    minAmount: 100000,
    minQuantity: 1,
    usedCount: 0,
    maxUses: 100,
    isActive: true,
  };

  const res1 = applyDiscounts(lines, [subPercentDiscount], today);
  assert(res1.discountTotal === 545000, `Expected 545000 paise, got ${res1.discountTotal}`);
  assert(res1.discountsUsed.length === 1, "Expected 1 discount used");

  // 2. Test Expired Discount
  console.log("  Testing expired discount...");
  const expiredDiscount: DiscountForPricing = {
    ...subPercentDiscount,
    endDate: new Date("2026-05-01T00:00:00Z"), // in the past relative to today
  };
  const res2 = applyDiscounts(lines, [expiredDiscount], today);
  assert(res2.discountTotal === 0, "Expired discount must yield 0 discount");
  assert(res2.discountsUsed.length === 0, "Expired discount must not be used");

  // 3. Test Future Discount (not yet active)
  console.log("  Testing future discount...");
  const futureDiscount: DiscountForPricing = {
    ...subPercentDiscount,
    startDate: new Date("2026-07-01T00:00:00Z"),
  };
  const res3 = applyDiscounts(lines, [futureDiscount], today);
  assert(res3.discountTotal === 0, "Future discount must yield 0 discount");

  // 4. Test Usage Limit Reached
  console.log("  Testing usage limit reached (maxUses vs usedCount)...");
  const maxedDiscount: DiscountForPricing = {
    ...subPercentDiscount,
    maxUses: 5,
    usedCount: 5,
  };
  const res4 = applyDiscounts(lines, [maxedDiscount], today);
  assert(res4.discountTotal === 0, "Discount at max uses must yield 0 discount");

  // 5. Test Min Quantity Not Met
  console.log("  Testing min quantity not met...");
  const highQtyDiscount: DiscountForPricing = {
    ...subPercentDiscount,
    minQuantity: 10, // Lines total is 3
  };
  const res5 = applyDiscounts(lines, [highQtyDiscount], today);
  assert(res5.discountTotal === 0, "Discount with unmet minQuantity must yield 0");

  // 6. Test Min Amount Not Met
  console.log("  Testing min amount not met...");
  const highAmountDiscount: DiscountForPricing = {
    ...subPercentDiscount,
    minAmount: 10000000, // 10,000,000 paise > 5,450,000 subtotal
  };
  const res6 = applyDiscounts(lines, [highAmountDiscount], today);
  assert(res6.discountTotal === 0, "Discount with unmet minAmount must yield 0");

  // 7. Test Product-Specific Fixed Discount
  console.log("  Testing product-specific fixed discount...");
  const prodFixedDiscount: DiscountForPricing = {
    id: "disc-erp",
    code: "FLAT500",
    name: "₹500 off ERP",
    type: DiscountType.FIXED,
    appliesTo: DiscountAppliesTo.PRODUCT,
    productId: "prod-erp",
    value: 50000, // ₹500 in paise
    minAmount: 0,
    minQuantity: 1,
    usedCount: 0,
    maxUses: 50,
    isActive: true,
  };
  const res7 = applyDiscounts(lines, [prodFixedDiscount], today);
  assert(res7.discountTotal === 50000, `Expected 50000 paise, got ${res7.discountTotal}`);
  assert(res7.discountsUsed[0].code === "FLAT500", "Expected FLAT500 used");

  // 8. Test Discount Never Exceeds Amount
  console.log("  Testing discount cap at subtotal...");
  const hugeDiscount: DiscountForPricing = {
    id: "disc-huge",
    code: "FREEALL",
    name: "Huge Discount",
    type: DiscountType.FIXED,
    appliesTo: DiscountAppliesTo.SUBSCRIPTION,
    value: 999999999, // 999 million paise
    minAmount: 0,
    minQuantity: 0,
    usedCount: 0,
    isActive: true,
  };
  const res8 = applyDiscounts(lines, [hugeDiscount], today);
  assert(res8.discountTotal === 5450000, "Discount must never exceed subtotal");

  // 9. Test Tax Calculation & Rounding
  console.log("  Testing calculateTax rounding...");
  // 18% on ₹1,000 (100,000 paise) = 18,000 paise
  const tax1 = calculateTax(100000, { percentageRate: 18.0 });
  assert(tax1 === 18000, `Expected 18000 paise, got ${tax1}`);

  // 18% on 155 paise = 27.9 paise -> rounds to 28 paise
  const tax2 = calculateTax(155, { percentageRate: 18.0 });
  assert(tax2 === 28, `Expected 28 paise, got ${tax2}`);

  // Tax on 0 or negative amount = 0
  const tax3 = calculateTax(0, { percentageRate: 18.0 });
  assert(tax3 === 0, "Tax on 0 must be 0");

  console.log("✅ ALL pricing.ts unit tests passed successfully!");
}

runPricingTests();
