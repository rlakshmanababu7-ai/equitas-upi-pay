import { db } from "./db";
import crypto from "crypto";

export interface CreatePaymentLinkInput {
  tokenHash: string;
  customerName: string;
  loanAccountNumber: string;
  upiId: string;
  amount: number | null;
  expiresAt: Date;
}

export interface PaymentLinkRecord {
  id: string;
  tokenHash: string;
  customerName: string;
  loanAccountNumber: string;
  upiId: string;
  amount: number | null;
  status: string;
  expiresAt: Date | string;
}

export async function createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLinkRecord> {
  const id = "link_" + crypto.randomBytes(12).toString("hex");
  const now = new Date();

  try {
    // Attempt standard Prisma model call
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const created = await (db as any).paymentLink.create({
      data: {
        id,
        tokenHash: input.tokenHash,
        customerName: input.customerName,
        loanAccountNumber: input.loanAccountNumber,
        upiId: input.upiId,
        amount: input.amount,
        status: "ACTIVE",
        expiresAt: input.expiresAt,
        createdAt: now,
        updatedAt: now,
      },
    });
    return created;
  } catch (error) {
    // Fallback to raw SQL in case Prisma client DLL was locked by dev server
    console.warn("Prisma model create fallback to raw SQL:", error);
    await db.$executeRawUnsafe(
      `INSERT INTO PaymentLink (id, tokenHash, customerName, loanAccountNumber, upiId, amount, status, expiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?)`,
      id,
      input.tokenHash,
      input.customerName,
      input.loanAccountNumber,
      input.upiId,
      input.amount,
      input.expiresAt.toISOString(),
      now.toISOString(),
      now.toISOString()
    );

    return {
      id,
      tokenHash: input.tokenHash,
      customerName: input.customerName,
      loanAccountNumber: input.loanAccountNumber,
      upiId: input.upiId,
      amount: input.amount,
      status: "ACTIVE",
      expiresAt: input.expiresAt,
    };
  }
}

export async function getPaymentLinkByHash(tokenHash: string): Promise<PaymentLinkRecord | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await (db as any).paymentLink.findUnique({
      where: { tokenHash },
    });
    if (record) return record;
  } catch {
    // Fallback to raw SQL
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (await db.$queryRawUnsafe(
      `SELECT id, tokenHash, customerName, loanAccountNumber, upiId, amount, status, expiresAt FROM PaymentLink WHERE tokenHash = ? LIMIT 1`,
      tokenHash
    )) as any[];

    if (rows && rows.length > 0) {
      const row = rows[0];
      return {
        id: row.id,
        tokenHash: row.tokenHash,
        customerName: row.customerName,
        loanAccountNumber: row.loanAccountNumber,
        upiId: row.upiId,
        amount: row.amount ? Number(row.amount) : null,
        status: row.status,
        expiresAt: new Date(row.expiresAt),
      };
    }
  }

  return null;
}
