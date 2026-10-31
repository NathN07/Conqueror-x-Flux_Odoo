# Brightloop Subscription Management System

A multi-tier SaaS Subscription Management & Invoicing Monorepo for Brightloop Software, built with Express, TypeScript, Prisma, PostgreSQL, React, Vite, and Tailwind CSS.

---

## 🏗 Repository Structure

```
subscription-system/
├── backend/                  # Node.js + Express + TypeScript + Prisma backend
│   ├── prisma/
│   │   ├── migrations/       # Versioned Prisma migration scripts
│   │   ├── schema.prisma     # Prisma database schema (Decimal(12,2) for all currencies)
│   │   └── seed.ts           # Initial database seeder
│   ├── src/
│   │   ├── middlewares/      # Error handler, Zod validation
│   │   ├── modules/          # Domain modules (catalog, discounts, payments, reports, portal)
│   │   ├── utils/            # DB client, pagination helper, AppError
│   │   ├── app.ts            # Express application setup
│   │   └── server.ts         # Server entrypoint
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React 18 + Vite + TypeScript + Tailwind frontend
│   ├── src/
│   │   ├── components/       # Shared UI (Table, Modal, StatusBadge, Pagination, FormField)
│   │   ├── routes/           # Per-owner route files + role-based navigation
│   │   ├── types/            # Auth and navigation type definitions
│   │   ├── App.tsx           # QueryClient, Router, Role Preview Switcher
│   │   ├── main.tsx          # React root mount
│   │   └── index.css         # Tailwind directives & design tokens
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.js    # Design tokens (status colors, shadows, border radii)
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   ├── API_CONTRACT.md       # Comprehensive REST API specifications v1
│   └── INTERFACES.md         # Cross-module typed interface contracts & stubs
├── .env.example              # Root environment template
├── .gitignore
├── package.json              # Monorepo workspaces definition
└── README.md
```

---

## ⚡ Quick Start & Run Steps

### 1. Prerequisites
- **Node.js**: v18.x or v20.x+ (v24.x supported)
- **PostgreSQL**: 14+ instance
- **npm** or **pnpm**

### 2. Environment Configuration
Copy `.env.example` to `.env` in the root or `backend/`:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Ensure your PostgreSQL connection string in `DATABASE_URL` is set:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brightloop_subscriptions?schema=public"
JWT_SECRET="brightloop_development_super_secret_jwt_key_2026"
PORT=5000
FRONTEND_URL="http://localhost:5173"
```

### 3. Install Dependencies
Run from the repository root:
```bash
npm install
```

### 4. Database Migration & Seeding
Generate the Prisma Client and run the initial migration:
```bash
# Generate Prisma Client
npm run prisma:generate

# Apply migrations to database
npm run prisma:migrate

# Seed database with initial users, products, plans, taxes, and discount
npm run prisma:seed
```

### 5. Running in Development Mode

Run backend and frontend concurrently:
```bash
# Terminal 1 - Backend Server (runs on http://localhost:5000)
npm run dev:backend

# Terminal 2 - Frontend Client (runs on http://localhost:5173)
npm run dev:frontend
```

---

## 🔑 Seeded Accounts & Credentials

The seed script (`backend/prisma/seed.ts`) populates known test accounts:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@brightloop.io` | `Admin@123456` | Full system access, catalog, billing runs |
| **STAFF** | `staff@brightloop.io` | `Staff@123456` | Operations, invoice management, recording |
| **CUSTOMER** | `customer1@acme.corp` | `Customer@123456` | Acme Corporation (Customer Portal) |
| **CUSTOMER** | `customer2@globex.com` | `Customer@123456` | Globex Industries (Customer Portal) |

---

## 📦 Seeded Catalog Data

1. **Products & Variants**:
   - `Enterprise ERP Suite` ($1,200.00 base)
     - Variant: **Brand Odoo** (Extra price: **+$560.00**)
     - Variant: **Standard Tier** (+$0.00)
     - Variant: **Premium Tier** (+$350.00)
   - `Cloud CRM Pro` ($800.00 base)
     - Variant: **Brand Odoo** (Extra price: **+$560.00**)
     - Variant: **Standard SLA** (+$0.00)
     - Variant: **Gold 24/7 SLA** (+$200.00)
   - `Brightloop Analytics & BI Add-on` ($450.00 base)
     - Variant: **50k Events/mo** (+$0.00)
     - Variant: **500k Events/mo** (+$250.00)

2. **Plans**:
   - `Growth Professional Monthly`: $1,500.00/month, renewable, pausable, early close allowed.
   - `Enterprise Scale Annual`: $15,000.00/year, renewable, pausable, early close allowed.

3. **Taxes**:
   - `Standard GST / VAT (18%)`: 18.00%
   - `Reduced Tech Services Tax (5%)`: 5.00%

4. **Discount**:
   - `SPRING2026 - 15% Off Subscriptions`: 15% discount on subscriptions with minimum purchase of $500.00.

---

## 📑 Documentation

- [API Contract Specification](docs/API_CONTRACT.md): Complete specifications for all `/api/v1` routes, roles, request/response JSON, pagination, and error shapes.
- [Cross-Module Interfaces](docs/INTERFACES.md): Typed method signatures and stubs (`getUnitPrice`, `applyDiscounts`, `incrementUsage`).

---

## 🛡 Build Verification

```bash
# Verify backend TypeScript compilation
npm run build:backend

# Verify frontend TypeScript compilation and Vite bundle
npm run build:frontend
```
