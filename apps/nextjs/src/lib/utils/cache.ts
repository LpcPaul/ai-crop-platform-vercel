import type Redis from 'ioredis';

import { config } from '../config';

interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private memoryCache: Map<string, CacheItem> = new Map();
  private redisClient: Redis | null = null;
  private redisInitPromise: Promise<void> | null = null;

  constructor() {
    if (config.cache.enabled) {
      void this.ensureRedis();
    }
  }

  private async ensureRedis(): Promise<void> {
    if (!config.cache.enabled || this.redisClient) {
      return;
    }
    if (this.redisInitPromise) {
      return this.redisInitPromise;
    }

    this.redisInitPromise = import('ioredis')
      .then(({ default: RedisClient }) => {
        const client = new RedisClient(config.cache.redisUrl);
        client.on('error', (error) => {
          console.warn('Redis connection error, falling back to memory cache:', error);
          this.redisClient = null;
        });
        this.redisClient = client;
      })
      .catch((error) => {
        console.warn('Redis initialization failed, falling back to memory cache:', error);
        this.redisClient = null;
      })
      .finally(() => {
        this.redisInitPromise = null;
      });

    await this.redisInitPromise;
  }

  async get(key: string): Promise<any | null> {
    try {
      await this.ensureRedis();
      // Try Redis first if available
      if (this.redisClient) {
        const cached = await this.redisClient.get(key);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Fallback to memory cache
      const item = this.memoryCache.get(key);
      if (item && Date.now() - item.timestamp < item.ttl) {
        return item.data;
      }

      // Clean expired item
      if (item) {
        this.memoryCache.delete(key);
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, data: any, ttl: number = config.cache.ttl): Promise<void> {
    try {
      await this.ensureRedis();
      const ttlSeconds = Math.max(1, Math.floor(ttl));
      // Store in Redis if available
      if (this.redisClient) {
        await this.redisClient.setex(key, ttlSeconds, JSON.stringify(data));
      }

      // Always store in memory cache as fallback
      this.memoryCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds * 1000, // Convert to milliseconds
      });

      // Clean up old memory cache items periodically
      this.cleanupMemoryCache();
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.ensureRedis();
      if (this.redisClient) {
        await this.redisClient.del(key);
      }
      this.memoryCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  private cleanupMemoryCache() {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }

  generateCacheKey(prefix: string, hash: string): string {
    return `${prefix}:${hash}`;
  }
}

export const cacheManager = new CacheManager();

export async function getCachedResult(imageHash: string): Promise<any | null> {
  const key = cacheManager.generateCacheKey('crop', imageHash);
  return await cacheManager.get(key);
}

export async function cacheResult(imageHash: string, result: any): Promise<void> {
  const key = cacheManager.generateCacheKey('crop', imageHash);
  await cacheManager.set(key, result);
}
