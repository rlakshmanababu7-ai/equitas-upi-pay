# Equitas — Loan UPI Payment Link Generator

A focused, industry-level web application for generating Equitas loan UPI payment links.

---

## ⚡ Overview

### 1. Link Generator (`/` and `/office`)
- **No login or authentication screens** required.
- **Mandatory Fields:**
  1. **Customer Name**
  2. **Loan Account Number**
- **Automatic UPI ID Generation:**
  - Format: `loan.<loanaccountnumber>@equitas`
  - Example: `loan.DHJ474949@equitas` (updates in real time as you type)
- **Optional Field:**
  3. **Amount (INR)** (optional; if left empty, customer pays as per their EMI dues)
- **Actions:**
  - One-click **Generate Payment Link** (valid for 1 day)
  - One-click **Copy Link**
  - **WhatsApp Share** template
  - **Open Payment Page** preview

---

### 2. Customer Payment Page (`/pay/[token]`)
Industry-level simple, trustworthy mobile-first interface:
- **Equitas Logo** prominently displayed at the top
- **Customer Name**
- **Customer Loan Account Number**
- **Loan UPI ID** (`loan.<loanaccountnumber>@equitas`) with 1-click copy button
- **Amount** (if specified)
- **UPI App Buttons:**
  - Google Pay (`tez://`)
  - PhonePe (`phonepe://`)
  - Paytm (`paytmmp://`)
  - Any UPI App (`upi://pay`)
- **QR Code** for scanning with any UPI mobile app

---

## ⏱ Expiry Validity
- Every link is valid for **1 day (24 hours)** from generation time.
- Clean customer payment experience without countdown clutter.
