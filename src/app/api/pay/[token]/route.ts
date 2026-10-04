import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { getServerConfig } from "@/lib/config";
import { generateUpiLinks, buildUpiQueryString } from "@/lib/upi";
import { checkRateLimit } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import QRCode from "qrcode";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  // Rate limit: max 60 lookups per minute per IP
  const rateLimit = await checkRateLimit(`pay_lookup:${ip}`, {
    limit: 60,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  if (!token || typeof token !== "string" || token.length < 16) {
    return NextResponse.json(
      { error: "Invalid payment link format." },
      { status: 400 }
    );
  }

  try {
    // 1. Hash the incoming token to find the record (unguessable SHA-256 lookup)
    const tokenHash = hashToken(token);
    const link = await db.paymentLink.findUnique({
      where: { tokenHash },
    });

    if (!link) {
      await logAuditEvent({
        action: "LINK_NOT_FOUND_ATTEMPT",
        ipAddress: ip,
        userAgent,
        metadata: { tokenPrefix: token.slice(0, 6) },
      });
      return NextResponse.json(
        { error: "Payment link not found or has been revoked." },
        { status: 404 }
      );
    }

    const now = new Date();
    const isExpired = now.getTime() > link.expiresAt.getTime();

    // 2. Strict Server-Side Expiry Check
    if (isExpired) {
      // Mark as EXPIRED in DB if still ACTIVE
      if (link.status === "ACTIVE") {
        await db.paymentLink.update({
          where: { id: link.id },
          data: { status: "EXPIRED" },
        });
      }

      await logAuditEvent({
        action: "EXPIRED_LINK_ACCESS_ATTEMPT",
        paymentLinkId: link.id,
        ipAddress: ip,
        userAgent,
      });

      return NextResponse.json({
        expired: true,
        loanReference: link.loanReference,
        customerName: link.customerName,
        expiresAt: link.expiresAt.toISOString(),
        message:
          "This payment link has expired (5-minute security limit exceeded). Please contact the office to generate a new EMI payment link.",
      });
    }

    // 3. Payment link is valid and active.
    // Notice: receiving UPI ID is ALWAYS our business merchant account from server env.
    const config = getServerConfig();
    const remainingSeconds = Math.max(
      0,
      Math.floor((link.expiresAt.getTime() - now.getTime()) / 1000)
    );

    const upiDetails = {
      payeeVpa: config.merchantUpiId,
      payeeName: config.merchantName,
      amount: link.amount,
      transactionRef: link.loanReference,
      transactionNote: link.description || `EMI Payment Ref ${link.loanReference}`,
      merchantCode: config.merchantCode,
    };

    const upiLinks = generateUpiLinks(upiDetails);
    const upiQuery = `upi://pay?${buildUpiQueryString(upiDetails)}`;

    // Generate high-resolution QR code as Data URL
    const qrCodeDataUrl = await QRCode.toDataURL(upiQuery, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: {
        dark: "#0b1b2b",
        light: "#ffffff",
      },
    });

    await logAuditEvent({
      action: "LINK_VIEWED",
      paymentLinkId: link.id,
      ipAddress: ip,
      userAgent,
    });

    return NextResponse.json({
      expired: false,
      amount: link.amount,
      loanReference: link.loanReference,
      customerName: link.customerName,
      description: link.description,
      expiresAt: link.expiresAt.toISOString(),
      serverTime: now.toISOString(),
      remainingSeconds,
      status: link.status,
      isVerified: link.isVerified,
      payeeDetails: {
        payeeVpa: config.merchantUpiId,
        payeeName: config.merchantName,
      },
      upiLinks,
      qrCodeDataUrl,
    });
  } catch (error) {
    console.error("Payment lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error looking up payment link." },
      { status: 500 }
    );
  }
}
