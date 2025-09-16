import { config } from '../config';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class SecurityValidator {
  static validateEnvironment(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required environment variables
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      errors.push('OPENAI_API_KEY is not properly configured');
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default-secret') {
      errors.push('JWT_SECRET is using default value - this is a security risk');
    }

    if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET === '1') {
      errors.push('NEXTAUTH_SECRET is not properly configured');
    }

    // Check for weak configurations
    if (config.security.jwtSecret === 'default-secret') {
      warnings.push('JWT secret is using default value');
    }

    if (config.rateLimit.max > 1000) {
      warnings.push('Rate limit is very high - consider lowering for better security');
    }

    if (!config.cache.enabled && config.performance.enableDedupCache) {
      warnings.push('Deduplication cache enabled but Redis cache disabled');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateApiKey(apiKey: string): boolean {
    // Check for common API key patterns and weak keys
    if (!apiKey || apiKey.length < 20) return false;
    if (apiKey.includes('test') || apiKey.includes('demo')) return false;
    if (apiKey === 'your_api_key_here') return false;
    return true;
  }

  static sanitizeInput(input: string): string {
    // Basic input sanitization
    return input.replace(/[<>\"'&]/g, '');
  }

  static validateImageFile(file: File): { valid: boolean; error?: string } {
    // Security checks for uploaded files
    const allowedTypes = config.image.allowedTypes;
    const maxSize = config.image.maxSize;

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum ${Math.round(maxSize / 1024 / 1024)}MB`
      };
    }

    // Check for suspicious file names
    if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
      return {
        valid: false,
        error: 'Invalid file name contains path traversal characters'
      };
    }

    return { valid: true };
  }

  static generateSecureToken(): string {
    return crypto.randomUUID() + '-' + Date.now().toString(36);
  }

  static isValidOrigin(origin: string): boolean {
    return config.security.corsOrigins.includes(origin);
  }

  static maskSensitiveData(data: any): any {
    const sensitiveKeys = ['apiKey', 'secret', 'password', 'token', 'key'];

    if (typeof data === 'string') {
      // Mask API keys and secrets in strings
      return data.replace(/([a-zA-Z0-9]{20,})/g, (match) => {
        if (match.length > 10) {
          return match.substring(0, 4) + '*'.repeat(match.length - 8) + match.substring(match.length - 4);
        }
        return match;
      });
    }

    if (typeof data === 'object' && data !== null) {
      const masked = { ...data };
      for (const key in masked) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          if (typeof masked[key] === 'string' && masked[key].length > 8) {
            masked[key] = masked[key].substring(0, 4) + '*'.repeat(masked[key].length - 8) + masked[key].substring(masked[key].length - 4);
          } else {
            masked[key] = '***MASKED***';
          }
        } else if (typeof masked[key] === 'object') {
          masked[key] = SecurityValidator.maskSensitiveData(masked[key]);
        }
      }
      return masked;
    }

    return data;
  }

  static logSecurityEvent(event: string, details: any, level: 'info' | 'warn' | 'error' = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      level,
      details: SecurityValidator.maskSensitiveData(details),
    };

    if (config.monitoring.enableLogging) {
      console[level](JSON.stringify(logEntry));
    }
  }
}

export function validateEnvironmentOnStartup(): void {
  const validation = SecurityValidator.validateEnvironment();

  if (!validation.valid) {
    console.error('Environment validation failed:', validation.errors);
    // In production, consider exiting the process
    if (process.env.NODE_ENV === 'production') {
      console.error('Production environment has critical security issues. Please fix before deploying.');
    }
  }

  if (validation.warnings.length > 0) {
    console.warn('Environment warnings:', validation.warnings);
  }
}