import { NextRequest, NextResponse } from "next/server";
import { generateSecureToken, hashToken } from "@/lib/crypto";
import { getServerConfig } from "@/lib/config";
import { generateEquitasUpiId } from "@/lib/upi";
import { createPaymentLink } from "@/lib/payment-db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, loanAccountNumber, amount } = body;

    // Mandatory validation
    if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
      return NextResponse.json(
        { error: "Customer Name is required." },
        { status: 400 }
      );
    }

    if (!loanAccountNumber || typeof loanAccountNumber !== "string" || !loanAccountNumber.trim()) {
      return NextResponse.json(
        { error: "Loan Account Number is required." },
        { status: 400 }
      );
    }

    const trimmedCustomerName = customerName.trim();
    const trimmedLoanAccount = loanAccountNumber.trim();
    const upiId = generateEquitasUpiId(trimmedLoanAccount);

    // Optional amount parsing
    let parsedAmount: number | null = null;
    if (amount !== undefined && amount !== null && amount !== "") {
      const num = parseFloat(String(amount));
      if (!isNaN(num) && num > 0) {
        parsedAmount = Math.round(num * 100) / 100;
      }
    }

    // Token generation
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    // Expiry: 1 day validity (24 hours)
    const config = getServerConfig();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.linkExpiryHours * 60 * 60 * 1000);

    // Save record
    const record = await createPaymentLink({
      tokenHash,
      customerName: trimmedCustomerName,
      loanAccountNumber: trimmedLoanAccount,
      upiId,
      amount: parsedAmount,
      expiresAt,
    });

    const paymentUrl = `${config.appBaseUrl}/pay/${rawToken}`;

    return NextResponse.json({
      success: true,
      linkId: record.id,
      token: rawToken,
      paymentUrl,
      customerName: trimmedCustomerName,
      loanAccountNumber: trimmedLoanAccount,
      upiId,
      amount: parsedAmount,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating Equitas payment link:", error);
    return NextResponse.json(
      { error: "Failed to generate link." },
      { status: 500 }
    );
  }
}
