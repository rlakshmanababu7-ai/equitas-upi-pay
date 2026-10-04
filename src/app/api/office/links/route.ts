import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStaffSession } from "@/lib/auth";
import { generateSecureToken, hashToken, getTokenPrefix } from "@/lib/crypto";
import { getServerConfig } from "@/lib/config";
import { checkRateLimit } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";

// UPI VPA validation regex
const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  try {
    const links = await db.paymentLink.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        createdBy: {
          select: { name: true, username: true },
        },
      },
    });

    const now = Date.now();
    const formattedLinks = links.map((link) => {
      const isExpired = now > link.expiresAt.getTime();
      const remainingSeconds = Math.max(
        0,
        Math.floor((link.expiresAt.getTime() - now) / 1000)
      );

      return {
        id: link.id,
        tokenPrefix: link.tokenPrefix,
        customerName: link.customerName,
        customerUpiId: link.customerUpiId,
        amount: link.amount,
        loanReference: link.loanReference,
        description: link.description,
        status: isExpired && link.status === "ACTIVE" ? "EXPIRED" : link.status,
        isVerified: link.isVerified,
        paymentProviderRef: link.paymentProviderRef,
        verifiedAt: link.verifiedAt,
        expiresAt: link.expiresAt.toISOString(),
        createdAt: link.createdAt.toISOString(),
        createdByName: link.createdBy.name,
        remainingSeconds,
      };
    });

    return NextResponse.json({ links: formattedLinks });
  } catch (error) {
    console.error("Failed to fetch links:", error);
    return NextResponse.json(
      { error: "Failed to retrieve payment links." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || undefined;

  // Rate limit: max 20 link creations per minute per staff/IP
  const rateLimit = await checkRateLimit(`create_link:${session.userId}`, {
    limit: 20,
    windowSeconds: 60,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Link creation rate limit reached. Please wait ${rateLimit.resetInSeconds} seconds.`,
      },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { customerName, customerUpiId, amount, loanReference, description } = body;

    // Validation
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "A valid positive EMI amount in INR is required." },
        { status: 400 }
      );
    }

    if (amount > 200000) {
      return NextResponse.json(
        { error: "Amount cannot exceed the standard UPI transaction limit of ₹2,00,000." },
        { status: 400 }
      );
    }

    if (!loanReference || typeof loanReference !== "string" || loanReference.trim().length < 3) {
      return NextResponse.json(
        { error: "Loan/Account reference is required (minimum 3 characters)." },
        { status: 400 }
      );
    }

    if (loanReference.length > 50) {
      return NextResponse.json(
        { error: "Loan/Account reference cannot exceed 50 characters." },
        { status: 400 }
      );
    }

    if (!customerUpiId || typeof customerUpiId !== "string") {
      return NextResponse.json(
        { error: "Customer UPI ID is required for internal reference records." },
        { status: 400 }
      );
    }

    const trimmedCustomerUpi = customerUpiId.trim().toLowerCase();
    if (!UPI_REGEX.test(trimmedCustomerUpi)) {
      return NextResponse.json(
        {
          error:
            "Invalid customer UPI ID format. Expected format: username@bank (e.g. customer@okhdfcbank).",
        },
        { status: 400 }
      );
    }

    const sanitizedCustomerName = customerName
      ? String(customerName).trim().slice(0, 100)
      : null;
    const sanitizedDescription = description
      ? String(description).trim().slice(0, 150)
      : null;
    const sanitizedLoanRef = String(loanReference).trim().toUpperCase();

    // 1. Generate unguessable 32-byte secure token (never stored in DB plaintext)
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = getTokenPrefix(rawToken);

    // 2. Strict 5-minute expiry enforcement calculated on the server
    const config = getServerConfig();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.linkExpiryMinutes * 60 * 1000);

    // 3. Save to database
    const paymentLink = await db.paymentLink.create({
      data: {
        tokenHash,
        tokenPrefix,
        customerName: sanitizedCustomerName,
        customerUpiId: trimmedCustomerUpi,
        amount: Math.round(amount * 100) / 100,
        loanReference: sanitizedLoanRef,
        description: sanitizedDescription,
        status: "ACTIVE",
        expiresAt,
        createdById: session.userId,
      },
    });

    // 4. Record audit log
    await logAuditEvent({
      action: "LINK_CREATED",
      paymentLinkId: paymentLink.id,
      ipAddress: ip,
      userAgent,
      metadata: {
        createdByStaff: session.username,
        amount,
        loanReference: sanitizedLoanRef,
        expiresAt: expiresAt.toISOString(),
      },
    });

    // Construct full shareable URL
    const paymentUrl = `${config.appBaseUrl}/pay/${rawToken}`;

    return NextResponse.json({
      success: true,
      linkId: paymentLink.id,
      token: rawToken,
      paymentUrl,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: config.linkExpiryMinutes * 60,
      details: {
        customerName: sanitizedCustomerName,
        amount: paymentLink.amount,
        loanReference: sanitizedLoanRef,
        description: sanitizedDescription,
      },
    });
  } catch (error) {
    console.error("Link creation error:", error);
    return NextResponse.json(
      { error: "Failed to generate payment link. Internal server error." },
      { status: 500 }
    );
  }
}
