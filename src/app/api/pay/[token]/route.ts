import { NextRequest, NextResponse } from "next/server";
import { hashToken } from "@/lib/crypto";
import { generateEquitasUpiLinks, buildEquitasUpiQuery } from "@/lib/upi";
import { getPaymentLinkByHash } from "@/lib/payment-db";
import QRCode from "qrcode";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  if (!token) {
    return NextResponse.json({ error: "Invalid payment link." }, { status: 400 });
  }

  try {
    const tokenHash = hashToken(token);
    const link = await getPaymentLinkByHash(tokenHash);

    if (!link) {
      return NextResponse.json({ error: "Payment link not found." }, { status: 404 });
    }

    const now = new Date();
    const expiryDate = new Date(link.expiresAt);
    const isExpired = now.getTime() > expiryDate.getTime();

    if (isExpired) {
      return NextResponse.json({
        expired: true,
        customerName: link.customerName,
        loanAccountNumber: link.loanAccountNumber,
        message: "This payment link has expired. Please request a new link.",
      });
    }

    // Payment details for Equitas
    const paymentDetails = {
      loanAccountNumber: link.loanAccountNumber,
      upiId: link.upiId,
      customerName: link.customerName,
      amount: link.amount,
    };

    const upiLinks = generateEquitasUpiLinks(paymentDetails);
    const upiQuery = `upi://pay?${buildEquitasUpiQuery(paymentDetails)}`;

    // Generate high quality QR code in Equitas Blue
    const qrCodeDataUrl = await QRCode.toDataURL(upiQuery, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: {
        dark: "#003874", // Equitas Bank Blue
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      expired: false,
      customerName: link.customerName,
      loanAccountNumber: link.loanAccountNumber,
      upiId: link.upiId,
      amount: link.amount,
      upiLinks,
      qrCodeDataUrl,
    });
  } catch (error) {
    console.error("Payment lookup error:", error);
    return NextResponse.json(
      { error: "Error loading payment details." },
      { status: 500 }
    );
  }
}
