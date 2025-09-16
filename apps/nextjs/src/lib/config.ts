export const config = {
  // AI API Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
    timeout: parseInt(process.env.OPENAI_TIMEOUT || '60000'),
  },

  // Crop Service Configuration
  cropService: {
    url: process.env.CROP_SERVICE_URL || 'http://localhost:3001',
    timeout: parseInt(process.env.CROP_SERVICE_TIMEOUT || '60000'),
  },

  // Image Processing
  image: {
    maxSize: parseInt(process.env.MAX_IMAGE_SIZE || '52428800'), // 50MB
    allowedTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
  },

  // Cache Configuration
  cache: {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.CACHE_TTL || '3600'),
    enabled: process.env.ENABLE_CACHE === 'true',
  },

  // Rate Limiting
  rateLimit: {
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    anonymousMax: parseInt(process.env.RATE_LIMIT_ANONYMOUS_MAX || '10'),
    useRedis: process.env.RATE_LIMIT_USE_REDIS === 'true',
  },

  // Security
  security: {
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    jwtSecret: process.env.JWT_SECRET || 'default-secret',
    enableIpWhitelist: process.env.ENABLE_IP_WHITELIST === 'true',
    ipWhitelist: (process.env.IP_WHITELIST || '').split(',').filter(Boolean),
  },

  // Monitoring & Logging
  monitoring: {
    enableLogging: process.env.ENABLE_LOGGING === 'true',
    logLevel: process.env.LOG_LEVEL || 'info',
    sentryDsn: process.env.SENTRY_DSN,
    enableMetrics: process.env.ENABLE_METRICS === 'true',
  },

  // Performance
  performance: {
    enableDedupCache: process.env.ENABLE_DEDUP_CACHE === 'true',
    enableImageOptimization: process.env.ENABLE_IMAGE_OPTIMIZATION === 'true',
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '10'),
  },
};
