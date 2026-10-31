# AGENTS.md - Subscription Management System (Brightloop)

## 1. Project Overview & Hackathon Objectives
Brightloop Subscription Management System is a full-lifecycle recurring billing and subscription management platform built for a hackathon. The system manages:
- Multi-role access control (`ADMIN`, `STAFF`, `CUSTOMER`).
- Product catalog with variants and surcharge pricing.
- Plans with flexible billing frequencies (daily, weekly, monthly, yearly) and renewal/closure policies.
- Quotation templates and multi-state subscription workflows (`DRAFT` → `QUOTATION` → `CONFIRMED` → `ACTIVE` → `CLOSED` / `PAUSED`).
- Automated invoice generation, automated tax calculations, and discount rules (percentage or fixed).
- Multi-method payment recording and accounts receivable / overdue tracking.
- High-performance financial metrics (MRR, ARR, active subscriptions, overdue aging, collection rates).

---

## 2. Tech Stack
- **Framework:** Next.js (App Router, React 19 / Server Components & Client Components)
- **Language:** TypeScript (strict mode enabled)
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui (Radix UI primitives, Lucide React icons)
- **Database & ORM:** PostgreSQL with Prisma ORM
- **Validation:** Zod schemas for client and server-side data validation
- **Authentication:** Session-based authentication / JWT with iron-session or NextAuth/Auth.js (role-based middleware & route protection)
- **Charts / Analytics:** Recharts / Tremor for finance dashboard metrics

---

## 3. Core Roles & Permissions Matrix

| Capability / Feature | ADMIN | STAFF | CUSTOMER |
| :--- | :---: | :---: | :---: |
| User & Staff Management (Create Staff, Manage Users) | ✅ | ❌ | ❌ |
| Manage Products, Variants & Price surcharges | ✅ | ❌ | ❌ |
| Manage Billing Plans & Rules | ✅ | ❌ | ❌ |
| Manage Tax Rules & Discount Rules | ✅ | ❌ | ❌ |
| Quotation Templates Management | ✅ | ✅ | ❌ |
| Create & Manage Subscriptions / Quotes | ✅ | ✅ | ❌ |
| Generate & Confirm Invoices | ✅ | ✅ | ❌ |
| Record Offline/Online Payments | ✅ | ✅ | ❌ |
| View Financial KPI Dashboard (MRR, ARR, Overdue) | ✅ | ✅ (limited) | ❌ |
| Customer Portal: View Own Subscriptions | ❌ | ❌ | ✅ |
| Customer Portal: View & Pay/Download Invoices | ❌ | ❌ | ✅ |

---

## 4. Non-Negotiable Coding Rules

1. **Money Stored as Integers in Paise:**
   - All monetary values (`salesPrice`, `costPrice`, `subtotal`, `taxAmount`, `discountAmount`, `totalAmount`, `amountPaid`) must be stored as **integers in paise** (1 INR = 100 paise).
   - Floating-point representations in the database or calculation pipeline are strictly forbidden.
   - Provide helper utilities:
     - `formatPaiseToInr(amountInPaise: number): string` (e.g., `56000` → `₹560.00`)
     - `parseInrToPaise(amountInInr: number | string): number`

2. **All Dates in UTC:**
   - All timestamps in the database, API payloads, and internal scheduling logic must be stored and computed in **UTC** (ISO 8601 string or Prisma `DateTime`).
   - Dates shown on the UI can format to local time or IST, but mutations and queries always use UTC ISO timestamps.

3. **Data Validation with Zod:**
   - Every Server Action, API Route Handler, and Form must validate payloads against a strict Zod schema before processing.
   - Password requirements strictly enforced: more than 8 characters (min 9), at least 1 uppercase letter, 1 lowercase letter, and 1 special character (`/^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$/`). A number is not required.

4. **Invoice & Payment Rules:**
   - Invoice Statuses: `DRAFT`, `CONFIRMED`, `PAID`, `CANCELLED`.
   - `OVERDUE` is **never stored** in the database; it is computed dynamically: `dueDate < today (UTC)` and `status NOT IN ('PAID', 'CANCELLED')`.
   - Partial payments are supported. An invoice transitions to `PAID` only when the sum of associated payments is greater than or equal to `totalAmount`.
   - Invoices include `periodStart` and `periodEnd` fields with `@@unique([subscriptionId, periodStart])` to prevent double billing.
   - Database indexes must be placed on `status`, `customerId`, `dueDate`, `nextBillingDate`, and `paymentDate`.

5. **Server Actions & Route Handlers:**
   - Mutative actions and form submissions should use Next.js Server Actions with clear return types (`{ success: boolean, data?: T, error?: string }`).
   - External webhooks, background cron triggers, and REST access endpoints go under `src/app/api/`.

5. **Type Safety & Strictness:**
   - No `any` types. All database results and API responses must have explicit TypeScript types or Prisma generated types.

---

## 5. Folder Structure

```
.
├── prisma/
│   ├── schema.prisma              # Database schema definitions
│   └── seed.ts                    # Demo seed data (Admin, Staff, Customers, Plans, Products)
├── public/                        # Static assets & brand logos
├── src/
│   ├── app/
│   │   ├── (auth)/                # Public authentication routes
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/           # Protected internal workspace (ADMIN & STAFF)
│   │   │   ├── layout.tsx         # Dashboard sidebar, navbar & breadcrumbs
│   │   │   ├── page.tsx           # Finance Lead & Operations KPI dashboard
│   │   │   ├── products/          # Products & variants catalog
│   │   │   ├── plans/             # Subscription plans management
│   │   │   ├── discounts/         # Discounts and coupon rules
│   │   │   ├── taxes/             # Tax rate configurations
│   │   │   ├── quotes/            # Quotation templates & active quotations
│   │   │   ├── subscriptions/     # Subscriptions management & lifecycle
│   │   │   ├── invoices/          # Invoices generation, status & PDF export
│   │   │   ├── payments/          # Payment recording & history
│   │   │   ├── staff/             # Staff management (Admin only)
│   │   │   └── customers/         # Customer directory
│   │   ├── (portal)/              # Customer Portal (CUSTOMER role)
│   │   │   ├── layout.tsx         # Customer portal shell
│   │   │   ├── portal/
│   │   │   │   ├── page.tsx       # Customer overview
│   │   │   │   ├── subscriptions/ # View personal subscriptions
│   │   │   │   └── invoices/      # View personal invoices & payment receipts
│   │   ├── api/                   # Route handlers
│   │   │   ├── auth/              # Auth endpoints
│   │   │   ├── cron/billing/      # Automated billing run trigger
│   │   │   └── invoices/[id]/pdf/ # Invoice printable/PDF download
│   │   ├── globals.css            # Tailwind CSS root stylesheet
│   │   └── layout.tsx             # Root layout with providers
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components (Button, Dialog, Table, etc.)
│   │   ├── shared/                # Navbar, Sidebar, UserNav, StatusBadges
│   │   ├── forms/                 # Form components with react-hook-form + zod
│   │   └── dashboard/             # Charts, metrics cards, data tables
│   ├── lib/
│   │   ├── prisma.ts              # Global Prisma client singleton
│   │   ├── auth.ts                # Session management, password hashing (bcrypt), RBAC guards
│   │   ├── money.ts               # Paise <-> INR conversion and math utilities
│   │   ├── dates.ts               # UTC date helpers & recurrence calculators
│   │   ├── billing-engine.ts      # Recurring invoice generation engine
│   │   └── validations/           # Zod schemas for all domain entities
│   │       ├── auth.ts
│   │       ├── product.ts
│   │       ├── plan.ts
│   │       ├── subscription.ts
│   │       ├── invoice.ts
│   │       └── discount.ts
│   ├── actions/                   # Next.js Server Actions
│   │   ├── auth.actions.ts
│   │   ├── product.actions.ts
│   │   ├── plan.actions.ts
│   │   ├── subscription.actions.ts
│   │   ├── invoice.actions.ts
│   │   ├── payment.actions.ts
│   │   └── staff.actions.ts
│   └── types/                     # Shared TypeScript interfaces & enums
├── SPEC.md                        # Hackathon Problem Specification
├── AGENTS.md                      # This reference guide
├── package.json
└── tsconfig.json
```

---

## 6. Key Domain State Machines

### Subscription Lifecycle:
`DRAFT` → `QUOTATION` → `CONFIRMED` → `ACTIVE` ⇄ `PAUSED` → `CLOSED` / `EXPIRED`

### Invoice Lifecycle:
`DRAFT` → `CONFIRMED` → `PAID` (or `CANCELLED` / `OVERDUE`)

### Billing Frequencies:
- `DAILY`
- `WEEKLY`
- `MONTHLY`
- `YEARLY`

---

## 7. Performance & Quality Guarantees
- Sub-2-second query performance via proper database indexes on foreign keys, `status`, `nextBillingDate`, and composite customer/date indexes.
- Atomic database transactions (`prisma.$transaction`) for invoice generation, subscription state transitions, and payment allocations.
- Zero floating-point rounding errors through integer paise storage.
