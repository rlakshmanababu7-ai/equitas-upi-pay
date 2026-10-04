/**
 * Standards-compliant UPI (Unified Payments Interface) deep link & intent generator
 * Specifically formatted for Equitas Loan Collections.
 */

export interface EquitasPaymentDetails {
  loanAccountNumber: string;
  upiId: string; // Format: loan.<loanaccountnumber>@equitas
  customerName: string;
  amount?: number | null; // Optional
}

export interface UpiAppLinks {
  universal: string;
  googlePay: string;
  phonePe: string;
  paytm: string;
}

/**
 * Generate Equitas UPI ID from loan account number.
 * Example: loan.DHJ474949@equitas
 */
export function generateEquitasUpiId(loanAccountNumber: string): string {
  const sanitized = loanAccountNumber.trim().replace(/\s+/g, "");
  return `loan.${sanitized}@equitas`;
}

/**
 * Builds the standard upi://pay query string
 */
export function buildEquitasUpiQuery(details: EquitasPaymentDetails): string {
  const params = new URLSearchParams({
    pa: details.upiId,
    pn: "Equitas",
    cu: "INR",
    tr: details.loanAccountNumber.trim(),
    tn: `Loan ${details.loanAccountNumber.trim()}`,
  });

  if (details.amount && details.amount > 0) {
    params.set("am", details.amount.toFixed(2));
  }

  return params.toString();
}

/**
 * Returns deep links for UPI applications
 */
export function generateEquitasUpiLinks(details: EquitasPaymentDetails): UpiAppLinks {
  const query = buildEquitasUpiQuery(details);
  return {
    universal: `upi://pay?${query}`,
    googlePay: `tez://upi/pay?${query}`,
    phonePe: `phonepe://pay?${query}`,
    paytm: `paytmmp://upi/pay?${query}`,
  };
}

/**
 * Formats Indian Rupee currency
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
