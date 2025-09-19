// Environment validation helper
function validateRequiredEnvVar(name: string, value: string | undefined): string {
  if (!value || value.trim() === '' || value === 'your_jwt_secret_here' || value === 'your_openai_api_key_here') {
    throw new Error(`Required environment variable ${name} is not set or uses placeholder value`);
  }
  return value;
}

// Validate critical environment variables in production
if (process.env.NODE_ENV === 'production') {
  validateRequiredEnvVar('CROP_SERVICE_URL', process.env.CROP_SERVICE_URL);
  validateRequiredEnvVar('JWT_SECRET', process.env.JWT_SECRET);
  // validateRequiredEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY); // Uncomment when OpenAI is required
}

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
    url: process.env.CROP_SERVICE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3002'),
    timeout: parseInt(process.env.CROP_SERVICE_TIMEOUT || '60000'),
  },

  // Image Processing
  image: {
    maxSize: parseInt(process.env.MAX_IMAGE_SIZE || '52428800'), // 50MB
    allowedTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif,image/bmp,image/tiff').split(','),
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
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'development-secret'),
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

  // Daily Usage Limits
  dailyLimit: {
    maxRequests: parseInt(process.env.DAILY_USAGE_LIMIT || '30'),
    warningThreshold: parseInt(process.env.DAILY_WARNING_THRESHOLD || '3'),
    resetHour: parseInt(process.env.DAILY_RESET_HOUR || '0'), // UTC hour for daily reset
  },
};
