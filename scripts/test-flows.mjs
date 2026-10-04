import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3000";

let staffCookie = "";

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`  ✔ ${message}`);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🚀 STARTING E2E VERIFICATION OF UPI EMI PAYMENT ENGINE");
  console.log("=======================================================\n");

  // TEST 1: Staff Authentication
  console.log("▶ TEST 1: Staff Authentication (/api/office/login)");
  {
    const res = await fetch(`${BASE_URL}/api/office/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "officer@apexfinserve.com",
        password: "ApexStaff2025!Secure",
      }),
    });

    assert(res.status === 200, `Login returns HTTP 200 (Got ${res.status})`);
    const setCookie = res.headers.get("set-cookie");
    assert(setCookie && setCookie.includes("staff_auth_token="), "HttpOnly staff session cookie issued");
    staffCookie = setCookie.split(";")[0];
    const data = await res.json();
    assert(data.success === true, "Login response contains success: true");
    assert(data.user.username === "officer@apexfinserve.com", "Session user matches staff identity");
  }

  // TEST 2: Generate Short-Lived EMI Payment Link
  console.log("\n▶ TEST 2: Generate Short-Lived 5-Min Payment Link (/api/office/links)");
  let rawToken = "";
  let paymentUrl = "";
  let linkExpiresAt = "";
  let linkId = "";
  const testLoanRef = `LN-TEST-${Date.now().toString().slice(-5)}`;
  const customerUpiRef = "customer.reference@okaxis";
  const emiAmount = 7850.50;

  {
    const res = await fetch(`${BASE_URL}/api/office/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie,
      },
      body: JSON.stringify({
        customerName: "Vikas Patel",
        customerUpiId: customerUpiRef,
        amount: emiAmount,
        loanReference: testLoanRef,
        description: "Two-Wheeler Loan EMI October 2026",
      }),
    });

    assert(res.status === 200, `Link creation returns HTTP 200 (Got ${res.status})`);
    const data = await res.json();
    assert(data.success === true, "Link generation response contains success: true");
    assert(typeof data.token === "string" && data.token.length >= 32, "Cryptographically strong raw token generated");
    assert(data.paymentUrl.includes(`/pay/${data.token}`), "Payment URL properly formatted without PII");
    assert(!data.paymentUrl.includes(customerUpiRef), "Customer UPI ID is NOT exposed in the payment URL");
    assert(!data.paymentUrl.includes(String(emiAmount)), "Payment amount is NOT exposed in the payment URL");

    rawToken = data.token;
    paymentUrl = data.paymentUrl;
    linkExpiresAt = data.expiresAt;
    linkId = data.linkId;

    // Verify 5-minute expiry calculation
    const now = Date.now();
    const expiryTime = new Date(linkExpiresAt).getTime();
    const diffMinutes = (expiryTime - now) / (60 * 1000);
    assert(diffMinutes >= 4.9 && diffMinutes <= 5.1, `Expires exactly ~5 minutes from creation (${diffMinutes.toFixed(2)} min)`);
  }

  // TEST 3: Database Security (Verify Token is Hashed with SHA-256)
  console.log("\n▶ TEST 3: Cryptographic Token Storage Inspection in Database");
  {
    const dbRecord = await prisma.paymentLink.findUnique({
      where: { id: linkId },
    });

    assert(!!dbRecord, "Payment link record exists in database");
    assert(dbRecord.tokenHash !== rawToken, "Raw token is NOT stored in the database plaintext");
    const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    assert(dbRecord.tokenHash === expectedHash, "Database stores exact SHA-256 hash of token");
    assert(dbRecord.customerUpiId === customerUpiRef, "Customer UPI ID stored for internal office records");
    assert(dbRecord.status === "ACTIVE", "Link status is initialized to ACTIVE");
    assert(dbRecord.isVerified === false, "Payment is initialized as unverified");
  }

  // TEST 4: Customer Page Lookup (/api/pay/[token])
  console.log("\n▶ TEST 4: Customer Page Data & UPI Receiving Intent Verification");
  {
    const res = await fetch(`${BASE_URL}/api/pay/${rawToken}`);
    assert(res.status === 200, `Customer lookup returns HTTP 200 (Got ${res.status})`);
    const data = await res.json();

    assert(data.expired === false, "Active link returns expired: false");
    assert(data.amount === emiAmount, `Returns correct EMI amount: ₹${data.amount}`);
    assert(data.loanReference === testLoanRef, `Returns loan reference: ${testLoanRef}`);

    // CRITICAL: Verify Merchant Payee UPI ID vs Customer UPI ID
    const businessReceivingUpi = "apexfinserve.emi@icici";
    assert(data.payeeDetails.payeeVpa === businessReceivingUpi, `Payee UPI ID is business account (${businessReceivingUpi})`);
    assert(data.payeeDetails.payeeVpa !== customerUpiRef, "Payee UPI ID is strictly NOT the customer's UPI ID");

    // Verify UPI Intents & Deep Links
    assert(data.upiLinks.universal.startsWith("upi://pay?"), "Universal UPI intent generated");
    assert(data.upiLinks.universal.includes(`pa=${encodeURIComponent(businessReceivingUpi)}`), "Universal intent contains merchant payee VPA");
    assert(data.upiLinks.universal.includes("am=7850.50"), "Universal intent contains exact amount (7850.50)");
    assert(data.upiLinks.googlePay.startsWith("tez://upi/pay?"), "Google Pay deep link generated");
    assert(data.upiLinks.phonePe.startsWith("phonepe://pay?"), "PhonePe deep link generated");
    assert(data.upiLinks.paytm.startsWith("paytmmp://upi/pay?"), "Paytm deep link generated");

    // Verify QR Code Data URL
    assert(data.qrCodeDataUrl.startsWith("data:image/png;base64,"), "High-resolution QR code Data URL generated");

    // Verify Customer UPI ID is NOT leaked
    assert(!data.customerUpiId, "Customer full UPI ID is NOT exposed in the customer API response");
  }

  // TEST 5: Customer "I have completed payment" Limitation Enforcement
  console.log("\n▶ TEST 5: Payment Completion Action Limitation (No False Confirmations)");
  {
    const res = await fetch(`${BASE_URL}/api/pay/${rawToken}/check-status`, {
      method: "POST",
    });

    assert(res.status === 200, `Status check returns HTTP 200 (Got ${res.status})`);
    const data = await res.json();

    assert(data.confirmed === false, "CRITICAL: Payment is NOT marked confirmed by user click");
    assert(data.status === "PENDING_VERIFICATION", "Status indicates awaiting banking confirmation");
    assert(data.message.includes("awaiting confirmation from our banking partner"), "Educational bank settlement notice provided");
  }

  // TEST 6: Provider Webhook Reconciliation (Cryptographic HMAC-SHA256)
  console.log("\n▶ TEST 6: Payment Provider Webhook Reconciliation with HMAC Signature");
  {
    const webhookSecret = "whsec_apex_prod_2025_98432a10bc";
    const webhookPayload = JSON.stringify({
      event: "payment.captured",
      loanReference: testLoanRef,
      utr: "UTR-AXIS-2026-9812401",
      amount: emiAmount,
      status: "SUCCESS",
    });

    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(webhookPayload)
      .digest("hex");

    const res = await fetch(`${BASE_URL}/api/webhooks/upi`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": signature,
      },
      body: webhookPayload,
    });

    assert(res.status === 200, `Webhook returns HTTP 200 (Got ${res.status})`);
    const data = await res.json();
    assert(data.success === true, "Webhook successfully reconciled payment");

    // Check DB status
    const dbRecord = await prisma.paymentLink.findUnique({
      where: { id: linkId },
    });
    assert(dbRecord.isVerified === true, "Database record marked isVerified: true");
    assert(dbRecord.status === "CONFIRMED", "Database record status transitioned to CONFIRMED");
    assert(dbRecord.paymentProviderRef === "UTR-AXIS-2026-9812401", "Provider UTR stored in database");

    // Re-check status endpoint as customer
    const statusRes = await fetch(`${BASE_URL}/api/pay/${rawToken}/check-status`, {
      method: "POST",
    });
    const statusData = await statusRes.json();
    assert(statusData.confirmed === true, "Status inquiry now confirms payment upon provider settlement");
  }

  // TEST 7: Server-Side 5-Minute Expiry Enforcement
  console.log("\n▶ TEST 7: Server-Side Expiry Rejection After 5 Minutes");
  {
    // Generate a temporary link and artificially age it past 5 minutes in the DB
    const res = await fetch(`${BASE_URL}/api/office/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: staffCookie,
      },
      body: JSON.stringify({
        customerUpiId: "expired.test@okaxis",
        amount: 2500,
        loanReference: `LN-EXPIRED-${Date.now().toString().slice(-4)}`,
      }),
    });
    const data = await res.json();
    const expiredToken = data.token;
    const expiredLinkId = data.linkId;

    // Set expiresAt to 10 seconds in the past in the DB
    await prisma.paymentLink.update({
      where: { id: expiredLinkId },
      data: { expiresAt: new Date(Date.now() - 10000) },
    });

    // Query customer endpoint
    const lookupRes = await fetch(`${BASE_URL}/api/pay/${expiredToken}`);
    const lookupData = await lookupRes.json();

    assert(lookupData.expired === true, "Server rejects expired token with expired: true");
    assert(!lookupData.upiLinks, "UPI deep links are STRICTLY withheld for expired link");
    assert(!lookupData.qrCodeDataUrl, "QR code is STRICTLY withheld for expired link");
    assert(lookupData.message.includes("5-minute security limit exceeded"), "Informs user of 5-minute security limit");
  }

  // TEST 8: Audit Logging
  console.log("\n▶ TEST 8: Compliance Audit Trail Verification");
  {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    assert(logs.length >= 3, `Audit logs recorded in database (Count: ${logs.length})`);
    const actions = logs.map((l) => l.action);
    console.log("  Audit Actions Logged:", actions.join(", "));
    assert(actions.includes("LINK_CREATED"), "LINK_CREATED audit log present");
    assert(actions.includes("WEBHOOK_RECEIVED"), "WEBHOOK_RECEIVED audit log present");
  }

  console.log("\n=======================================================");
  console.log("🎉 ALL 8 E2E INTEGRATION & SECURITY TESTS PASSED!");
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
