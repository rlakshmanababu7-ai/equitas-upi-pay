import { generateEquitasUpiId } from "./upi";

export interface PaymentPayload {
  customerName: string;
  loanAccountNumber: string;
  amount?: number | null;
  createdAt?: number;
}

export interface DecodedPaymentData {
  customerName: string;
  loanAccountNumber: string;
  upiId: string;
  amount: number | null;
  expired: boolean;
}

/**
 * Encodes loan payment details into a URL-safe base64 token without any database.
 */
export function encodePaymentPayload(payload: PaymentPayload): string {
  const data = {
    n: payload.customerName.trim(),
    l: payload.loanAccountNumber.trim().toUpperCase(),
    a: payload.amount && payload.amount > 0 ? Math.round(payload.amount * 100) / 100 : null,
    t: payload.createdAt || Date.now(),
  };

  const json = JSON.stringify(data);
  // URL-safe base64
  if (typeof window !== "undefined") {
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } else {
    return Buffer.from(json, "utf-8")
      .toString("base64url");
  }
}

/**
 * Decodes the token into customer and loan details.
 * Link expires after 1 day (24 hours).
 */
export function decodePaymentPayload(token: string): DecodedPaymentData | null {
  try {
    let json = "";
    if (typeof window !== "undefined") {
      const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      json = decodeURIComponent(escape(atob(padded)));
    } else {
      json = Buffer.from(token, "base64url").toString("utf-8");
    }

    const data = JSON.parse(json);
    if (!data.n || !data.l) return null;

    const loanAccountNumber = String(data.l).trim().toUpperCase();
    const customerName = String(data.n).trim();
    const amount = data.a ? Number(data.a) : null;
    const createdAt = data.t ? Number(data.t) : Date.now();

    // 1 day expiry (24 hours = 86,400,000 ms)
    const isExpired = Date.now() - createdAt > 24 * 60 * 60 * 1000;

    return {
      customerName,
      loanAccountNumber,
      upiId: generateEquitasUpiId(loanAccountNumber),
      amount,
      expired: isExpired,
    };
  } catch {
    return null;
  }
}
