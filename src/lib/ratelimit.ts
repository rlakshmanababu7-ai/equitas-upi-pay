import { db } from "./db";

interface RateLimitOptions {
  limit: number;      // Maximum allowed requests in window
  windowSeconds: number; // Window duration in seconds
}

// In-memory fallback cache for fast sub-millisecond checks
const inMemoryCache = new Map<string, { count: number; expiresAt: number }>();

/**
 * Checks and increments rate limit for a specific action key (e.g. "create_link:127.0.0.1")
 * Returns { allowed: boolean, remaining: number, resetInSeconds: number }
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions = { limit: 30, windowSeconds: 60 }
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;

  // 1. Fast in-memory check
  const memRecord = inMemoryCache.get(key);
  if (memRecord && memRecord.expiresAt > now) {
    if (memRecord.count >= options.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: Math.ceil((memRecord.expiresAt - now) / 1000),
      };
    }
    memRecord.count += 1;
    return {
      allowed: true,
      remaining: options.limit - memRecord.count,
      resetInSeconds: Math.ceil((memRecord.expiresAt - now) / 1000),
    };
  }

  // Set / Reset in-memory window
  const newExpiresAt = now + windowMs;
  inMemoryCache.set(key, { count: 1, expiresAt: newExpiresAt });

  // Periodically clean stale cache entries
  if (inMemoryCache.size > 1000) {
    for (const [k, v] of inMemoryCache.entries()) {
      if (v.expiresAt <= now) inMemoryCache.delete(k);
    }
  }

  // 2. Persistent database rate limiting (suitable for multi-instance Vercel serverless)
  try {
    const expiresAtDate = new Date(newExpiresAt);
    const existing = await db.rateLimitRecord.findUnique({ where: { key } });

    if (existing && existing.expiresAt > new Date()) {
      if (existing.count >= options.limit) {
        return {
          allowed: false,
          remaining: 0,
          resetInSeconds: Math.ceil((existing.expiresAt.getTime() - now) / 1000),
        };
      }
      const updated = await db.rateLimitRecord.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
      return {
        allowed: true,
        remaining: Math.max(0, options.limit - updated.count),
        resetInSeconds: Math.ceil((existing.expiresAt.getTime() - now) / 1000),
      };
    } else {
      await db.rateLimitRecord.upsert({
        where: { key },
        create: { key, count: 1, expiresAt: expiresAtDate },
        update: { count: 1, expiresAt: expiresAtDate },
      });
    }
  } catch (error) {
    // If DB check fails, fail-open to in-memory check to prevent blocking legitimate requests
    console.warn("DB rate-limit fallback triggered:", error);
  }

  return {
    allowed: true,
    remaining: options.limit - 1,
    resetInSeconds: options.windowSeconds,
  };
}
