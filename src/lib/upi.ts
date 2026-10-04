/**
 * Standards-compliant UPI (Unified Payments Interface) deep link & intent generator.
 * Specification based on NPCI UPI Linking Specs.
 *
 * CRITICAL BUSINESS RULE:
 * `payeeVpa` is ALWAYS the business receiving account (configured server-side via MERCHANT_UPI_ID).
 * It is NEVER the customer's UPI ID.
 */

export interface UpiPaymentDetails {
  payeeVpa: string;         // Business receiving UPI ID
  payeeName: string;        // Business registered display name
  amount: number;           // Payment amount in INR
  transactionRef: string;   // Unique internal reference / Loan ID
  transactionNote: string;  // Note shown in user's bank/UPI app
  merchantCode?: string;    // MCC e.g. 6012 (Finance/Lending)
}

export interface UpiAppLinks {
  universal: string;
  googlePay: string;
  phonePe: string;
  paytm: string;
  bhim: string;
}

/**
 * Builds the standard RFC/NPCI compliant upi://pay query parameter string
 */
export function buildUpiQueryString(details: UpiPaymentDetails): string {
  const formattedAmount = details.amount.toFixed(2);
  const params = new URLSearchParams({
    pa: details.payeeVpa,
    pn: details.payeeName,
    am: formattedAmount,
    cu: "INR",
    tr: details.transactionRef,
    tn: details.transactionNote.slice(0, 50), // Standard UPI notes max 50 chars
  });

  if (details.merchantCode) {
    params.set("mc", details.merchantCode);
  }

  return params.toString();
}

/**
 * Returns deep links for all major Indian UPI applications and the universal intent.
 */
export function generateUpiLinks(details: UpiPaymentDetails): UpiAppLinks {
  const queryString = buildUpiQueryString(details);
  const universal = `upi://pay?${queryString}`;

  return {
    universal,
    // Google Pay handles tez://upi/pay or standard upi://pay
    googlePay: `tez://upi/pay?${queryString}`,
    // PhonePe custom scheme
    phonePe: `phonepe://pay?${queryString}`,
    // Paytm UPI custom scheme
    paytm: `paytmmp://upi/pay?${queryString}`,
    // BHIM scheme
    bhim: `bhim://pay?${queryString}`,
  };
}

/**
 * Formats Indian Rupee currency with standard Indian numbering system (e.g. ₹1,23,456.00)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Safely masks a customer UPI ID for internal/audit preview without exposing full identifier
 * e.g., "rahul.sharma@okicici" -> "ra***ma@okicici"
 */
export function maskUpiId(upiId: string): string {
  if (!upiId || !upiId.includes("@")) return upiId;
  const [handle, provider] = upiId.split("@");
  if (handle.length <= 3) {
    return `${handle[0]}***@${provider}`;
  }
  const start = handle.slice(0, 2);
  const end = handle.slice(-2);
  return `${start}***${end}@${provider}`;
}
