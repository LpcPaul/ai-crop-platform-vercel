import type Redis from 'ioredis';

import { config } from '../config';

interface MemoryCounter {
  count: number;
  resetTime: number;
}

const memoryCounters = new Map<string, MemoryCounter>();
let redisClient: Redis | null = null;
let redisInitPromise: Promise<void> | null = null;

async function ensureRedis(): Promise<void> {
  if (!config.rateLimit.useRedis) {
    return;
  }
  if (redisClient) {
    return;
  }
  if (redisInitPromise) {
    return redisInitPromise;
  }

  redisInitPromise = import('ioredis')
    .then(({ default: RedisClient }) => {
      const client = new RedisClient(config.cache.redisUrl);
      client.on('error', (error) => {
        console.warn('Rate limiter Redis error, using in-memory fallback:', error);
        redisClient = null;
      });
      redisClient = client;
    })
    .catch((error) => {
      console.warn('Rate limiter failed to initialize Redis, using in-memory fallback:', error);
      redisClient = null;
    })
    .finally(() => {
      redisInitPromise = null;
    });

  return redisInitPromise;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  await ensureRedis();

  if (redisClient) {
    const redisKey = `ratelimit:${key}`;
    try {
      const results = await redisClient
        .multi()
        .incr(redisKey)
        .pexpire(redisKey, windowMs, 'NX')
        .exec();

      const incrResult = results?.[0]?.[1];
      const currentCount = typeof incrResult === 'number' ? incrResult : Number(incrResult ?? 0);
      return {
        allowed: currentCount <= limit,
        remaining: Math.max(0, limit - currentCount),
      };
    } catch (error) {
      console.warn('Redis rate limit error, falling back to in-memory counter:', error);
    }
  }

  const now = Date.now();
  const existing = memoryCounters.get(key);
  if (!existing || now > existing.resetTime) {
    memoryCounters.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
  };
}
