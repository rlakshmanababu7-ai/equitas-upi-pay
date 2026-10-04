# Equitas — Loan UPI Payment Link Generator

A lightweight, high-performance web application for generating Equitas loan UPI payment links.

---

## ⚡ Architecture: 100% Frontend & Stateless (Zero Database)

- **Database**: **NONE**. No database, no Prisma DB, no SQLite, no PostgreSQL.
- **Backend Latency**: Zero. The entire payment data (`customerName`, `loanAccountNumber`, `amount`, `createdAt`) is encoded directly into a URL-safe, tamper-resistant token.
- **Expiry**: 1 day validity (calculated directly from the token timestamp).

---

## 🚀 Vercel Deployment

### Are any Environment Variables required?
**NO.** There are **ZERO mandatory environment variables**!
You can import the repository into Vercel and click **Deploy** immediately.

### Optional Environment Variable
| Variable | Required? | Description | Example |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | **Optional** | Your public production domain URL. If omitted, the app automatically defaults to the browser's current `window.location.origin`. | `https://your-app.vercel.app` |

---

## 🛠 Key Features

1. **Link Generator (`/`)**:
   - Customer Name (Mandatory)
   - Loan Account Number (Mandatory, numbers only, exactly 12 digits)
   - Automatic UPI ID preview: `loan.<loanaccountnumber>@equitas`
   - Amount (Optional, text field, numbers only, no stepper arrows)
   - One-click **Copy Link** & **WhatsApp Share** (sends only the link).

2. **Customer Payment Screen (`/pay/[token]`)**:
   - Official Equitas Small Finance Bank logo
   - Customer Name & 12-digit Loan Account Number (large, high-contrast typography)
   - Loan UPI ID with a robust mobile-safe **Copy** button
   - Official brand logos for **Google Pay**, **PhonePe**, and **Paytm**
   - **"Get QR Code"** popup button ensuring the page fits on mobile screens without scrolling.
