import { generateEquitasUpiId } from "./upi";

export interface PaymentPayload {
  customerName: string;
  loanAccountNumber?: string | null;
  upiId: string;
  amount?: number | null;
  createdAt?: number;
}

export interface DecodedPaymentData {
  customerName: string;
  loanAccountNumber: string | null;
  upiId: string;
  amount: number | null;
  expired: boolean;
}

/**
 * Encodes loan payment details into a clean, WhatsApp-safe hexadecimal alphanumeric token.
 * Contains ONLY [0-9a-f] characters - NO underscores (_) or dashes (-) which break WhatsApp's
 * link parser due to WhatsApp markdown italics formatting.
 */
export function encodePaymentPayload(payload: PaymentPayload): string {
  const data = {
    n: payload.customerName.trim(),
    l: payload.loanAccountNumber && payload.loanAccountNumber.trim()
      ? payload.loanAccountNumber.trim().toUpperCase()
      : null,
    u: payload.upiId.trim(),
    a: payload.amount && payload.amount > 0 ? Math.round(payload.amount * 100) / 100 : null,
    t: payload.createdAt || Date.now(),
  };

  const json = JSON.stringify(data);
  const utf8Bytes = new TextEncoder().encode(json);
  let hex = "";
  for (let i = 0; i < utf8Bytes.length; i++) {
    hex += utf8Bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Decodes the token into customer and loan details.
 * Supports both clean hex tokens and legacy base64url tokens.
 * Link expires after 1 day (24 hours).
 */
export function decodePaymentPayload(token: string): DecodedPaymentData | null {
  try {
    if (!token) return null;
    const cleanToken = token.trim();

    let json = "";

    // 1. Hex encoding (WhatsApp-safe [0-9a-f])
    if (/^[0-9a-fA-F]+$/.test(cleanToken) && cleanToken.length % 2 === 0) {
      const bytes = new Uint8Array(cleanToken.length / 2);
      for (let i = 0; i < cleanToken.length; i += 2) {
        bytes[i / 2] = parseInt(cleanToken.substring(i, i + 2), 16);
      }
      json = new TextDecoder().decode(bytes);
    } else {
      // 2. Fallback for base64url tokens
      let base64 = cleanToken.replace(/-/g, "+").replace(/_/g, "/");
      const pad = base64.length % 4;
      if (pad) {
        base64 += "=".repeat(4 - pad);
      }
      if (typeof window !== "undefined") {
        json = decodeURIComponent(escape(atob(base64)));
      } else {
        json = Buffer.from(base64, "base64").toString("utf-8");
      }
    }

    const data = JSON.parse(json);
    if (!data.n || (!data.l && !data.u)) return null;

    const customerName = String(data.n).trim();
    const loanAccountNumber = data.l ? String(data.l).trim().toUpperCase() : null;
    const upiId = data.u
      ? String(data.u).trim()
      : loanAccountNumber
      ? generateEquitasUpiId(loanAccountNumber)
      : "";

    if (!upiId) return null;

    const amount = data.a ? Number(data.a) : null;
    const createdAt = data.t ? Number(data.t) : Date.now();

    // 1 day expiry (24 hours = 86,400,000 ms)
    const isExpired = Date.now() - createdAt > 24 * 60 * 60 * 1000;

    return {
      customerName,
      loanAccountNumber,
      upiId,
      amount,
      expired: isExpired,
    };
  } catch (err) {
    console.error("Decode token error:", err);
    return null;
  }
}
