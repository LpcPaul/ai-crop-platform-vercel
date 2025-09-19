import type Redis from 'ioredis';

import { config } from '../config';

interface MemoryCounter {
  count: number;
  resetDate: string;
}

interface DailyUsageResult {
  allowed: boolean;
  remaining: number;
  used: number;
  limit: number;
  resetTime: string;
  shouldWarn: boolean;
}

const memoryCounters = new Map<string, MemoryCounter>();
let redisClient: Redis | null = null;
let redisInitPromise: Promise<void> | null = null;

async function ensureRedis(): Promise<void> {
  if (!config.cache.enabled) {
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
        console.warn('Daily usage limiter Redis error, using in-memory fallback:', error);
        redisClient = null;
      });
      redisClient = client;
    })
    .catch((error) => {
      console.warn('Daily usage limiter failed to initialize Redis, using in-memory fallback:', error);
      redisClient = null;
    })
    .finally(() => {
      redisInitPromise = null;
    });

  return redisInitPromise;
}

function getTodayDateString(): string {
  const now = new Date();
  // Use UTC for consistent daily reset across timezones
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextResetTime(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(config.dailyLimit.resetHour, 0, 0, 0);
  return tomorrow.toISOString();
}

export async function checkDailyUsage(
  ip: string,
  increment: boolean = true,
): Promise<DailyUsageResult> {
  await ensureRedis();

  const today = getTodayDateString();
  const limit = config.dailyLimit.maxRequests;
  const warningThreshold = config.dailyLimit.warningThreshold;

  if (redisClient) {
    const redisKey = `daily:${ip}:${today}`;
    try {
      let currentCount: number;

      if (increment) {
        const result = await redisClient.incr(redisKey);
        currentCount = result;

        // Set expiration for the key (expires at end of day + 1 hour for safety)
        const secondsUntilTomorrow = Math.ceil((new Date(getNextResetTime()).getTime() - Date.now()) / 1000) + 3600;
        await redisClient.expire(redisKey, secondsUntilTomorrow);
      } else {
        const result = await redisClient.get(redisKey);
        currentCount = parseInt(result || '0', 10);
      }

      const remaining = Math.max(0, limit - currentCount);
      const shouldWarn = remaining <= warningThreshold && remaining > 0;

      return {
        allowed: currentCount <= limit,
        remaining,
        used: currentCount,
        limit,
        resetTime: getNextResetTime(),
        shouldWarn,
      };
    } catch (error) {
      console.warn('Redis daily usage error, falling back to in-memory counter:', error);
    }
  }

  // Memory fallback
  const key = `${ip}:${today}`;
  const existing = memoryCounters.get(key);

  if (!existing || existing.resetDate !== today) {
    const newCount = increment ? 1 : 0;
    memoryCounters.set(key, {
      count: newCount,
      resetDate: today,
    });

    const remaining = Math.max(0, limit - newCount);
    const shouldWarn = remaining <= warningThreshold && remaining > 0;

    return {
      allowed: newCount <= limit,
      remaining,
      used: newCount,
      limit,
      resetTime: getNextResetTime(),
      shouldWarn,
    };
  }

  if (increment) {
    existing.count += 1;
  }

  const remaining = Math.max(0, limit - existing.count);
  const shouldWarn = remaining <= warningThreshold && remaining > 0;

  return {
    allowed: existing.count <= limit,
    remaining,
    used: existing.count,
    limit,
    resetTime: getNextResetTime(),
    shouldWarn,
  };
}

export async function getDailyUsageStatus(ip: string): Promise<DailyUsageResult> {
  return checkDailyUsage(ip, false);
}

export function formatResetTime(resetTime: string): string {
  const resetDate = new Date(resetTime);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return '0 小时';
  }

  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffHours < 24) {
    return `${diffHours} 小时`;
  }

  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;

  if (remainingHours === 0) {
    return `${diffDays} 天`;
  }

  return `${diffDays} 天 ${remainingHours} 小时`;
}