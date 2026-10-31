# Brightloop Subscription Management System - Cross-Module Interfaces

This document outlines the typed internal contracts and inter-module interfaces between independent domain modules. Each interface is defined in TypeScript, compiles cleanly, and is currently backed by a typed stub implementation designed for seamless replacement by domain engineers.

---

## 1. Catalog Pricing Interface

### Location
`backend/src/modules/catalog/pricing.ts`

### Purpose
Allows the Subscriptions, Invoicing, and Quotation engines to compute the active unit price of a product, accounting for attribute variant surcharges (e.g., Brand "Odoo" = +560.00).

### Method Signature
```typescript
import { Prisma } from '@prisma/client';

export async function getUnitPrice(
  productId: string,
  variantId?: string
): Promise<Prisma.Decimal>;
```

### Parameters
- `productId` (`string`): Unique identifier of the product.
- `variantId` (`string`, optional): Unique identifier of the specific product variant (e.g., brand, tier, SLA).

### Returns
- `Promise<Prisma.Decimal>`: The effective unit sales price (`product.salesPrice + (variant?.extraPrice ?? 0)`).

### Stub Implementation Behavior
- Queries `prisma.product.findUnique` including `variants`.
- If the product does not exist, throws `AppError.notFound('Product with ID "..." not found')`.
- Adds `variant.extraPrice` to `product.salesPrice` when `variantId` is present.
- Returns `Prisma.Decimal(12, 2)` matching the database precision specification.

---

## 2. Discounts Engine Interface

### Location
`backend/src/modules/discounts/apply.ts`

### Purpose
Allows the Billing and Invoicing pipelines to calculate promotional discounts for line items and atomically update usage counts upon invoice confirmation.

### Data Types
```typescript
import { Prisma } from '@prisma/client';

export interface DiscountableLine {
  productId: string;
  variantId?: string | null;
  amount: Prisma.Decimal | number;
  quantity: number;
}

export interface AppliedDiscountResult {
  discountId: string;
  amount: Prisma.Decimal;
}
```

### Method Signatures

#### A. `applyDiscounts`
```typescript
export async function applyDiscounts(
  lines: DiscountableLine[],
  date?: Date
): Promise<AppliedDiscountResult[]>;
```
- **Parameters**:
  - `lines`: Array of items eligible for discount calculation.
  - `date`: Effective timestamp for time-bounded campaigns (defaults to `new Date()`).
- **Returns**: Array of calculated discounts with target `discountId` and discount deduction `amount`.
- **Stub Behavior**: Returns an empty array `[]`. Ready for promo code matching and tiered deduction algorithm.

#### B. `incrementUsage`
```typescript
export async function incrementUsage(
  discountIds: string[],
  tx?: Prisma.TransactionClient
): Promise<void>;
```
- **Parameters**:
  - `discountIds`: Array of discount IDs applied to the finalized invoice.
  - `tx`: Optional active Prisma transaction client for atomic state changes.
- **Behavior**: Increments `usedCount` on the matching discount records within the transaction.

---

## 3. Payments Summary Interface

### Location
`backend/src/modules/payments/summary.ts`

### Status
- Specification indicates: **None required**.
- A placeholder stub `getPaymentSummaryStub` is provided to maintain module symmetry and allow future revenue reconciliations without breaking consumers.

---

## Guidelines for Teammates & Developers

1. **Do not modify method signatures**: Consumers depend on the existing TypeScript type signatures.
2. **Database transactions**: When updating transactional state across modules (e.g. invoicing + discount usage), always accept and forward the optional `tx: Prisma.TransactionClient`.
3. **Decimals**: All currency calculations must use `Prisma.Decimal` (Decimal.js) with 2 decimal places to avoid floating-point inaccuracies.
