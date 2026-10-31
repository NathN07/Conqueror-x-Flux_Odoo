# Brightloop Subscription Management System - API Contract v1

All API endpoints are mounted under base path `/api/v1`.

---

## 1. Global Conventions

### Authentication
Endpoints marked with **Auth: Required** require an HTTP `Authorization` header containing a JSON Web Token (JWT):
```http
Authorization: Bearer <jwt_token>
```

### Standard Error Response Shape
All errors return the standard error structure with appropriate HTTP status codes (400, 401, 403, 404, 409, 500):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload provided",
    "details": [
      {
        "path": "email",
        "message": "Invalid email address"
      }
    ]
  }
}
```

### Standard Paginated List Response Shape
All listing endpoints accept query parameters `?page=1&limit=10` (default `limit=10`, max `limit=100`) and return:
```json
{
  "data": [
    { ... }
  ],
  "page": 1,
  "limit": 10,
  "total": 45
}
```

---

## 2. Authentication (`/api/v1/auth`)

### POST `/api/v1/auth/login`
- **Roles**: Public
- **Request**:
```json
{
  "email": "admin@brightloop.io",
  "password": "Admin@123456"
}
```
- **Response** `(200 OK)`:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI...",
  "user": {
    "id": "usr_cuid123",
    "email": "admin@brightloop.io",
    "name": "System Administrator",
    "role": "ADMIN"
  }
}
```

### POST `/api/v1/auth/forgot-password`
- **Roles**: Public
- **Request**:
```json
{
  "email": "customer1@acme.corp"
}
```
- **Response** `(200 OK)`:
```json
{
  "message": "If an account with that email exists, password reset instructions have been sent."
}
```

### POST `/api/v1/auth/reset-password`
- **Roles**: Public
- **Request**:
```json
{
  "token": "reset_token_hex_string",
  "newPassword": "NewSecurePassword@123"
}
```
- **Response** `(200 OK)`:
```json
{
  "message": "Password successfully reset."
}
```

---

## 3. Users (`/api/v1/users`)

### GET `/api/v1/users`
- **Roles**: `ADMIN`, `STAFF`
- **Query**: `?page=1&limit=10&role=CUSTOMER`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "usr_1",
      "email": "customer1@acme.corp",
      "name": "Acme Corporation",
      "role": "CUSTOMER",
      "createdAt": "2026-10-31T00:00:00.000Z",
      "customerProfile": {
        "phone": "+1-555-0199",
        "company": "Acme Corp",
        "address": "123 Innovation Way, San Francisco, CA"
      }
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

### POST `/api/v1/users`
- **Roles**: `ADMIN`
- **Request**:
```json
{
  "email": "staff2@brightloop.io",
  "password": "TemporaryPassword@123",
  "name": "Alex Operations",
  "role": "STAFF"
}
```
- **Response** `(201 Created)`:
```json
{
  "id": "usr_2",
  "email": "staff2@brightloop.io",
  "name": "Alex Operations",
  "role": "STAFF",
  "createdAt": "2026-10-31T09:00:00.000Z"
}
```

---

## 4. Products & Variants (`/api/v1/catalog/products`)

### GET `/api/v1/catalog/products`
- **Roles**: `ADMIN`, `STAFF`
- **Query**: `?page=1&limit=10`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "prod_1",
      "name": "Enterprise ERP Suite",
      "type": "service",
      "salesPrice": "1200.00",
      "costPrice": "400.00",
      "notes": "Integrated software suite",
      "variants": [
        {
          "id": "var_1",
          "attribute": "Brand",
          "value": "Odoo",
          "extraPrice": "560.00"
        }
      ]
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 3
}
```

### POST `/api/v1/catalog/products`
- **Roles**: `ADMIN`
- **Request**:
```json
{
  "name": "Dedicated Support SLA",
  "type": "service",
  "salesPrice": "500.00",
  "costPrice": "150.00",
  "notes": "24/7 technical assistance",
  "variants": [
    {
      "attribute": "Coverage",
      "value": "24/7 Priority",
      "extraPrice": "200.00"
    }
  ]
}
```
- **Response** `(201 Created)`: Full product object with created variants.

### POST `/api/v1/catalog/products/:id/variants`
- **Roles**: `ADMIN`
- **Request**:
```json
{
  "attribute": "Brand",
  "value": "Odoo",
  "extraPrice": "560.00"
}
```
- **Response** `(201 Created)`:
```json
{
  "id": "var_2",
  "productId": "prod_1",
  "attribute": "Brand",
  "value": "Odoo",
  "extraPrice": "560.00"
}
```

---

## 5. Plans (`/api/v1/catalog/plans`)

### GET `/api/v1/catalog/plans`
- **Roles**: `ADMIN`, `STAFF`
- **Query**: `?page=1&limit=10&status=ACTIVE`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "plan_1",
      "name": "Growth Professional Monthly",
      "price": "1500.00",
      "billingPeriod": "MONTHLY",
      "minQuantity": 1,
      "allowPause": true,
      "allowRenew": true,
      "allowEarlyClose": true,
      "autoClose": false,
      "status": "ACTIVE"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 2
}
```

### POST `/api/v1/catalog/plans`
- **Roles**: `ADMIN`
- **Request**:
```json
{
  "name": "Enterprise Scale Annual",
  "price": "15000.00",
  "billingPeriod": "YEARLY",
  "minQuantity": 1,
  "allowPause": true,
  "allowRenew": true,
  "allowEarlyClose": true,
  "autoClose": false,
  "status": "ACTIVE"
}
```
- **Response** `(201 Created)`: Created plan record.

---

## 6. Taxes (`/api/v1/catalog/taxes`)

### GET `/api/v1/catalog/taxes`
- **Roles**: `ADMIN`, `STAFF`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "tax_1",
      "name": "Standard GST / VAT (18%)",
      "percent": "18.00",
      "active": true
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 2
}
```

### POST `/api/v1/catalog/taxes`
- **Roles**: `ADMIN`
- **Request**:
```json
{
  "name": "Municipal Surcharge",
  "percent": "2.50",
  "active": true
}
```
- **Response** `(201 Created)`: Created tax object.

---

## 7. Discounts (`/api/v1/discounts`)

### GET `/api/v1/discounts`
- **Roles**: `ADMIN`, `STAFF`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "disc_1",
      "name": "SPRING2026 - 15% Off Subscriptions",
      "type": "PERCENT",
      "value": "15.00",
      "minPurchase": "500.00",
      "minQuantity": 1,
      "startDate": "2026-01-01T00:00:00.000Z",
      "endDate": "2026-12-31T23:59:59.000Z",
      "usageLimit": 500,
      "usedCount": 0,
      "appliesTo": "SUBSCRIPTION",
      "productId": null
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

### POST `/api/v1/discounts`
- **Roles**: `ADMIN`
- **Request**:
```json
{
  "name": "WELCOME100 - $100 Off Product",
  "type": "FIXED",
  "value": "100.00",
  "minPurchase": "1000.00",
  "minQuantity": 1,
  "appliesTo": "PRODUCT",
  "productId": "prod_1"
}
```
- **Response** `(201 Created)`: Created discount object.

---

## 8. Quotation Templates (`/api/v1/quotation-templates`)

### GET `/api/v1/quotation-templates`
- **Roles**: `ADMIN`, `STAFF`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "qtmp_1",
      "name": "Standard Enterprise Package",
      "validityDays": 30,
      "planId": "plan_1",
      "lines": [
        {
          "id": "qline_1",
          "productId": "prod_1",
          "variantId": "var_1",
          "quantity": 1
        }
      ]
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

### POST `/api/v1/quotation-templates`
- **Roles**: `ADMIN`, `STAFF`
- **Request**:
```json
{
  "name": "Cloud CRM + Odoo Bundle",
  "validityDays": 30,
  "planId": "plan_1",
  "lines": [
    {
      "productId": "prod_2",
      "variantId": "var_2",
      "quantity": 2
    }
  ]
}
```
- **Response** `(201 Created)`: Created quotation template with lines.

---

## 9. Subscriptions (`/api/v1/subscriptions`)

### GET `/api/v1/subscriptions`
- **Roles**: `ADMIN`, `STAFF`
- **Query**: `?page=1&limit=10&status=ACTIVE&customerId=usr_1`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "sub_1",
      "number": "SUB-2026-00001",
      "customerId": "usr_1",
      "planId": "plan_1",
      "startDate": "2026-10-01T00:00:00.000Z",
      "expiryDate": "2027-10-01T00:00:00.000Z",
      "paymentTerms": "IMMEDIATE",
      "status": "ACTIVE",
      "nextBillingDate": "2026-11-01T00:00:00.000Z",
      "lastBilledPeriodEnd": "2026-10-31T23:59:59.000Z",
      "lines": [
        {
          "id": "sline_1",
          "productId": "prod_1",
          "variantId": "var_1",
          "quantity": 1,
          "unitPrice": "1760.00",
          "taxId": "tax_1",
          "amount": "1760.00"
        }
      ]
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

### POST `/api/v1/subscriptions`
- **Roles**: `ADMIN`, `STAFF`
- **Request**:
```json
{
  "customerId": "usr_1",
  "planId": "plan_1",
  "startDate": "2026-11-01T00:00:00.000Z",
  "expiryDate": "2027-11-01T00:00:00.000Z",
  "paymentTerms": "IMMEDIATE",
  "lines": [
    {
      "productId": "prod_1",
      "variantId": "var_1",
      "quantity": 1,
      "taxId": "tax_1"
    }
  ]
}
```
- **Response** `(201 Created)`: Created subscription with generated sequential number `SUB-2026-00001` and status `DRAFT`.

### POST `/api/v1/subscriptions/:id/transition`
- **Roles**: `ADMIN`, `STAFF`
- **Request**:
```json
{
  "toStatus": "ACTIVE",
  "note": "Quotation approved and contract signed by customer"
}
```
- **Response** `(200 OK)`:
```json
{
  "id": "sub_1",
  "number": "SUB-2026-00001",
  "previousStatus": "CONFIRMED",
  "status": "ACTIVE",
  "transitionHistory": {
    "fromStatus": "CONFIRMED",
    "toStatus": "ACTIVE",
    "changedById": "usr_admin",
    "note": "Quotation approved and contract signed by customer",
    "createdAt": "2026-10-31T09:30:00.000Z"
  }
}
```

---

## 10. Invoices (`/api/v1/invoices`)

### GET `/api/v1/invoices`
- **Roles**: `ADMIN`, `STAFF`
- **Query**: `?page=1&limit=10&status=PAID`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "inv_1",
      "number": "INV-2026-00001",
      "subscriptionId": "sub_1",
      "customerId": "usr_1",
      "status": "CONFIRMED",
      "periodStart": "2026-10-01T00:00:00.000Z",
      "periodEnd": "2026-10-31T23:59:59.000Z",
      "issueDate": "2026-10-01T00:00:00.000Z",
      "dueDate": "2026-10-15T00:00:00.000Z",
      "subtotal": "1760.00",
      "taxTotal": "316.80",
      "discountTotal": "0.00",
      "total": "2076.80",
      "amountPaid": "0.00"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

### POST `/api/v1/invoices/run-billing`
- **Roles**: `ADMIN`, `STAFF`
- **Request**:
```json
{
  "targetDate": "2026-11-01T00:00:00.000Z"
}
```
- **Response** `(200 OK)`:
```json
{
  "invoicesGenerated": 12,
  "subscriptionsProcessed": 12,
  "skippedAlreadyBilled": 3
}
```

### POST `/api/v1/invoices/:id/confirm`
- **Roles**: `ADMIN`, `STAFF`
- **Response** `(200 OK)`: Transition invoice from `DRAFT` to `CONFIRMED`.

### POST `/api/v1/invoices/:id/cancel`
- **Roles**: `ADMIN`
- **Request**:
```json
{
  "reason": "Billing adjustment per customer request"
}
```
- **Response** `(200 OK)`: Invoice status set to `CANCELLED`.

### POST `/api/v1/invoices/:id/send`
- **Roles**: `ADMIN`, `STAFF`
- **Response** `(200 OK)`:
```json
{
  "message": "Invoice INV-2026-00001 dispatched via SMTP to customer1@acme.corp"
}
```

### GET `/api/v1/invoices/:id/pdf`
- **Roles**: `ADMIN`, `STAFF`, `CUSTOMER` (only own invoice)
- **Response**: `application/pdf` binary stream.

---

## 11. Payments (`/api/v1/payments`)

### GET `/api/v1/payments`
- **Roles**: `ADMIN`, `STAFF`
- **Query**: `?page=1&limit=10`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "pay_1",
      "invoiceId": "inv_1",
      "method": "CARD",
      "amount": "2076.80",
      "paidAt": "2026-10-02T14:32:00.000Z",
      "note": "Stripe charge ch_123456",
      "recordedById": "usr_admin"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

### POST `/api/v1/payments`
- **Roles**: `ADMIN`, `STAFF`
- **Request**:
```json
{
  "invoiceId": "inv_1",
  "method": "UPI",
  "amount": "2076.80",
  "note": "Ref ID: UPI-849302"
}
```
- **Response** `(201 Created)`: Payment record created and invoice marked as `PAID`.

---

## 12. Reports (`/api/v1/reports`)

### GET `/api/v1/reports/revenue`
- **Roles**: `ADMIN`, `STAFF`
- **Response** `(200 OK)`:
```json
{
  "mrr": "24500.00",
  "arr": "294000.00",
  "totalRevenue": "580000.00",
  "currency": "USD"
}
```

### GET `/api/v1/reports/subscriptions`
- **Roles**: `ADMIN`, `STAFF`
- **Response** `(200 OK)`:
```json
{
  "active": 142,
  "paused": 8,
  "closed": 15,
  "churnRate": 3.2
}
```

### GET `/api/v1/reports/tax-summary`
- **Roles**: `ADMIN`, `STAFF`
- **Query**: `?year=2026&quarter=Q3`
- **Response** `(200 OK)`:
```json
{
  "quarter": "2026-Q3",
  "taxCollected": "34200.00",
  "breakdown": [
    { "taxName": "Standard GST / VAT (18%)", "amount": "29500.00" },
    { "taxName": "Reduced Tech Services Tax (5%)", "amount": "4700.00" }
  ]
}
```

---

## 13. Customer Portal (`/api/v1/portal`)

### GET `/api/v1/portal/me/subscriptions`
- **Roles**: `CUSTOMER`
- **Query**: `?page=1&limit=10`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "sub_1",
      "number": "SUB-2026-00001",
      "plan": {
        "name": "Growth Professional Monthly",
        "billingPeriod": "MONTHLY"
      },
      "startDate": "2026-10-01T00:00:00.000Z",
      "expiryDate": "2027-10-01T00:00:00.000Z",
      "status": "ACTIVE",
      "nextBillingDate": "2026-11-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

### GET `/api/v1/portal/me/invoices`
- **Roles**: `CUSTOMER`
- **Query**: `?page=1&limit=10`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "inv_1",
      "number": "INV-2026-00001",
      "periodStart": "2026-10-01T00:00:00.000Z",
      "periodEnd": "2026-10-31T23:59:59.000Z",
      "dueDate": "2026-10-15T00:00:00.000Z",
      "total": "2076.80",
      "amountPaid": "2076.80",
      "status": "PAID"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

### GET `/api/v1/portal/me/payments`
- **Roles**: `CUSTOMER`
- **Query**: `?page=1&limit=10`
- **Response** `(200 OK)`:
```json
{
  "data": [
    {
      "id": "pay_1",
      "invoiceNumber": "INV-2026-00001",
      "method": "CARD",
      "amount": "2076.80",
      "paidAt": "2026-10-02T14:32:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```
