import { db } from "./db";

export type AuditAction =
  | "LINK_CREATED"
  | "LINK_VIEWED"
  | "QR_GENERATED"
  | "INTENT_CLICKED"
  | "STATUS_CHECK_INITIATED"
  | "EXPIRED_LINK_ACCESS_ATTEMPT"
  | "LINK_NOT_FOUND_ATTEMPT"
  | "WEBHOOK_RECEIVED"
  | "STAFF_LOGIN_SUCCESS"
  | "STAFF_LOGIN_FAILED"
  | "STAFF_LOGOUT";

interface LogAuditOptions {
  action: AuditAction;
  paymentLinkId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an immutable audit trail entry for compliance and security monitoring.
 */
export async function logAuditEvent(options: LogAuditOptions): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: options.action,
        paymentLinkId: options.paymentLinkId || null,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent ? options.userAgent.slice(0, 255) : null,
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
