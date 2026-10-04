# Apex FinServe — Short-Lived UPI EMI Payment Engine

A production-minded, high-security web application for generating short-lived EMI payment links (expiring in **exactly 5 minutes**) and collecting payments via the Unified Payments Interface (UPI).

---

## 🏛 Product Overview

The application provides two purpose-built, distinct experiences:

1. **Staff Office Portal (`/office`)**:
   - Protected with HttpOnly encrypted JWT session authentication.
   - Authorized officers input loan references, EMI amounts in INR, customer names, and the customer's UPI ID (retained solely for internal audit reference).
   - Generates a cryptographically unguessable payment URL with a live 5-minute countdown, 1-click clipboard copy, and a formatted WhatsApp share template.
   - Includes real-time link monitoring and a manual Bank UTR reconciliation desk.

2. **Customer Payment Landing (`/pay/[token]`)**:
   - Mobile-first, accessible interface with verified NBFC merchant credentials.
   - Live 5-minute countdown timer synchronized with server-side expiry timestamps.
   - Dynamic deep links for **Google Pay**, **PhonePe**, **Paytm**, and universal UPI (`upi://pay`).
   - High-contrast UPI QR code and copyable business payee address.
   - Prominent payee verification notice instructing customers to verify the merchant name and amount prior to entering their UPI PIN.
   - Server-enforced expired state rejecting payment initiation once the 5-minute window has elapsed.
   - An *"I have completed payment"* action that queries the server reconciliation ledger without falsely claiming success.

---

## 🔒 Critical Business & Security Rules

### 1. Business Payee Routing (Server-Side Only)
* **The Rule:** The customer's UPI ID entered by office staff is **only an internal reference** for accounting and ledger lookups. It is **NEVER** the receiving account.
* **The Implementation:** All customer payments are collected strictly into the receiving UPI ID configured server-side via the `MERCHANT_UPI_ID` environment variable (e.g. `apexfinserve.emi@icici`). This value is never exposed in client bundles or modified by URL parameters.

### 2. Cryptographic Token Protection (No Plaintext Tokens in DB)
* Tokens are generated using Node's cryptographic random byte generator (256 bits of entropy, URL-safe base64).
* The raw token is delivered once to the staff generator and customer URL.
* The database stores only the **SHA-256 cryptographic hash** of the token (`tokenHash`), preventing token enumeration or database leakage risks.

### 3. Strict 5-Minute Server-Enforced Expiry
* Expiry is not just a UI animation. Every API lookup (`GET /api/pay/[token]`) and reconciliation attempt calculates `now > expiresAt`.
* Expired links are rejected by the server, hiding QR codes and disabling UPI deep links.

### 4. Honest Payment Verification & Limitation Notice
* **Limitation:** UPI transfers settle directly between banks. Returning to the webpage, clicking a link, or opening a UPI app does **NOT** constitute proof of payment.
* Payments are confirmed **ONLY** through:
  1. Cryptographically signed gateway webhooks (`POST /api/webhooks/upi` with HMAC-SHA256 signature verification).
  2. Staff manual reconciliation via confirmed Bank UTR / RRN credit advice.
* The customer UI transparently informs users that their payment is in an *"Awaiting Bank Confirmation"* status until automated settlement finishes.

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions & Route Handlers)
- **Language**: TypeScript 5
- **Database**: Prisma ORM with SQLite (local development) and PostgreSQL compatibility (Vercel Postgres, Neon, Supabase)
- **Styling**: Tailwind CSS with custom fintech navy & emerald palette
- **Authentication**: Jose (JWT signed cookies with HttpOnly, SameSite, Secure flags)
- **Cryptography**: Node.js `crypto` (scrypt password hashing, timing-safe equality, SHA-256)
- **QR Code Engine**: `qrcode` (high-res SVG/Data URL generation)
- **Icons**: Lucide React

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node v20 & v24)
- npm or pnpm

### 2. Clone and Install Dependencies
```bash
cd UPI_pay
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` values are pre-configured for local testing:
```env
DATABASE_URL="file:./dev.db"
MERCHANT_UPI_ID="apexfinserve.emi@icici"
MERCHANT_NAME="Apex FinServe Lending Ltd"
MERCHANT_CODE="6012"
APP_BASE_URL="http://localhost:3000"
SESSION_SECRET="d8f28b7a63e9c4021a8d05e3f4261798ac7e3d1f05a49c2e718b3d6e5a4f1c90"
WEBHOOK_SECRET="whsec_apex_prod_2025_98432a10bc"
STAFF_DEFAULT_USERNAME="officer@apexfinserve.com"
STAFF_DEFAULT_PASSWORD="ApexStaff2025!Secure"
```

### 4. Database Setup & Seeding
Push the schema to your SQLite database and seed the default staff user:
```bash
npx prisma db push
node scripts/seed.mjs
```

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
- Landing Page: [http://localhost:3000](http://localhost:3000)
- Staff Login: [http://localhost:3000/office/login](http://localhost:3000/office/login)
  - **Username:** `officer@apexfinserve.com`
  - **Password:** `ApexStaff2025!Secure`
- Staff Office Desk: [http://localhost:3000/office](http://localhost:3000/office)

### 6. Run E2E Integration & Security Test Suite
A complete test suite is included in `scripts/test-flows.mjs` verifying all 8 business flows:
```bash
node scripts/test-flows.mjs
```

---

## 🗄 Database Configuration for Vercel Deployment

For production deployments on Vercel, connect a persistent managed PostgreSQL database (such as **Vercel Postgres**, **Neon**, **Supabase**, or **AWS RDS**).

### Switching from SQLite to PostgreSQL:

1. Update the `datasource` block in `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Generate the Prisma client and push schema:
```bash
npx prisma generate
npx prisma db push
```

3. Set your production `DATABASE_URL` in the Vercel project environment variables:
```
DATABASE_URL="postgres://default:password@ep-host.pooler.region.neon.tech/neondb?sslmode=require"
```

---

## ☁️ Deploying to Vercel

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. In the Vercel dashboard, click **Add New Project** and import the repository.
3. In **Environment Variables**, provide:
   - `DATABASE_URL` (Connection string to Neon / Supabase / Vercel Postgres)
   - `MERCHANT_UPI_ID` (Your business receiving VPA, e.g. `yourbusiness.emi@bank`)
   - `MERCHANT_NAME` (Registered legal merchant name)
   - `MERCHANT_CODE` (`6012` for loan services)
   - `SESSION_SECRET` (Generate using `openssl rand -hex 32`)
   - `WEBHOOK_SECRET` (Shared secret with your payment provider)
   - `APP_BASE_URL` (`https://your-project.vercel.app`)
4. In **Build & Development Settings**, keep the default build command:
   ```bash
   prisma generate && next build
   ```
5. Click **Deploy**.

---

## 💳 Payment Gateway & Webhook Integration Points

The application features a ready-to-use webhook listener at `/api/webhooks/upi` with HMAC-SHA256 signature verification.

### Supported Providers:
- **Razorpay**: Header `x-razorpay-signature`
- **Cashfree**: Header `x-webhook-signature`
- **Setu UPI Collect / Generic UPI**: Header `x-signature` or `x-api-signature`

### Webhook Ingestion Schema:
Send a `POST` request to `https://your-domain.com/api/webhooks/upi` with the appropriate signature header:
```json
{
  "event": "payment.captured",
  "loanReference": "LN-2025-98432",
  "utr": "UTR427819842104",
  "amount": 12500.00,
  "status": "SUCCESS"
}
```

Upon receipt:
1. Validates `crypto.timingSafeEqual` against the HMAC-SHA256 digest using `WEBHOOK_SECRET`.
2. Locates the `PaymentLink` record by `loanReference`.
3. Sets `status: "CONFIRMED"`, `isVerified: true`, `paymentProviderRef: utr`, `verifiedAt: new Date()`.
4. Writes an immutable entry to `AuditLog`.

---

## 🛡 Security & Audit Features

- **Rate Limiting**:
  - `POST /api/office/links`: Max 20 link creations per minute per staff.
  - `POST /api/office/login`: Max 5 login attempts per 5 minutes per IP to block brute-forcing.
  - `GET /api/pay/[token]`: Max 60 lookups per minute per IP.
- **Audit Logging**:
  - Tracks `LINK_CREATED`, `LINK_VIEWED`, `STATUS_CHECK_INITIATED`, `EXPIRED_LINK_ACCESS_ATTEMPT`, `WEBHOOK_RECEIVED`, and `STAFF_LOGIN`.
- **Security Headers**:
  - `X-Frame-Options: DENY` (prevents clickjacking)
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 📄 License
Internal proprietary software for Apex FinServe Lending Ltd.
