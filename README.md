# Brightloop - Subscription Management System

Brightloop is a full-lifecycle recurring billing and subscription management platform built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Prisma, and PostgreSQL.

---

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling & UI:** Tailwind CSS & shadcn/ui (Radix UI + Lucide React)
- **Database & ORM:** PostgreSQL with Prisma ORM
- **Validation:** Zod
- **Architecture:** Server Actions & Route Handlers (`/app/api`)

---

## Beginner Setup Guide (Windows PowerShell)

Follow these steps one by one in Windows PowerShell to set up and run the application locally.

### Step 1: Clone the repository (if not already done)
```powershell
git clone <repository-url>
```
```powershell
cd Conqueror-x-Flux_Odoo
```

### Step 2: Create environment configuration
Copy the example environment file to `.env`:
```powershell
Copy-Item .env.example .env
```

Open `.env` in your code editor and verify or update your PostgreSQL `DATABASE_URL`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brightloop?schema=public"
```

### Step 3: Install project dependencies
```powershell
npm install
```

### Step 4: Run database migrations and seed data
```powershell
npx prisma migrate dev --name init
```
```powershell
npx prisma db seed
```

### Step 5: Run the development server
```powershell
npm run dev
```

### Step 6: Open the application in your browser
Open your browser and navigate to:
```
http://localhost:3000
```

---

## Key Coding Rules & Conventions

1. **Integer Paise for Money:**
   - All amounts (`salesPrice`, `costPrice`, `subtotal`, `taxAmount`, `discountAmount`, `totalAmount`, `amountPaid`) are stored as integers in paise (1 INR = 100 paise).
2. **UTC Timestamps:**
   - All dates in the database and API payloads are stored and computed in UTC.
3. **Strict Validation:**
   - All inputs are validated via Zod schemas before processing.
4. **Roles & Permissions:**
   - `ADMIN`: Complete system management, catalog configuration, staff creation.
   - `STAFF`: Day-to-day operations (quotes, subscriptions, invoices, payment registration).
   - `CUSTOMER`: Self-service portal for viewing their own subscriptions and invoices.
5. **Invoicing & Billing:**
   - Invoices are uniquely billed per subscription period (`@@unique([subscriptionId, periodStart])`).
   - Overdue is calculated dynamically (`dueDate < today` and not `PAID`/`CANCELLED`), never stored as a static status.

---

## Project Structure

```
├── AGENTS.md                  # Project rules, architecture & coding conventions
├── SPEC.md                    # Functional requirements specification
├── README.md                  # Setup instructions
├── prisma/
│   └── schema.prisma          # Prisma database schema definition
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Admin & staff operations workspace
│   │   │   ├── layout.tsx     # Dashboard layout with persistent sidebar
│   │   │   └── page.tsx       # Operations & billing overview
│   │   ├── globals.css        # Tailwind CSS and shadcn theme variables
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── shared/            # Shared components (Sidebar, Navbar, etc.)
│   │   └── ui/                # UI primitives (Button, etc.)
│   └── lib/
│       └── utils.ts           # Utility functions (cn helper)
├── .env.example               # Template environment variables
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```
