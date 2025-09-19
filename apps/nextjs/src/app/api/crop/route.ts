import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

import { config } from '~/lib/config';
import { ImageProcessor } from '~/lib/utils/image';
import { getCachedResult, cacheResult } from '~/lib/utils/cache';
import { SecurityValidator } from '~/lib/utils/security';
import { consumeRateLimit } from '~/lib/utils/rate-limit';
import { checkDailyUsage } from '~/lib/utils/daily-usage-limiter';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const clientIp =
      request.ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Check daily usage limit first
    const dailyUsage = await checkDailyUsage(clientIp, false);
    if (!dailyUsage.allowed) {
      return NextResponse.json(
        {
          error: 'Daily limit exceeded',
          message: `今天的${config.dailyLimit.maxRequests}次免费裁剪已用完，明天00:00重置`,
          messageEn: `Daily limit of ${config.dailyLimit.maxRequests} free crops exceeded. Resets at 00:00 tomorrow.`,
          dailyUsage: {
            used: dailyUsage.used,
            limit: dailyUsage.limit,
            remaining: dailyUsage.remaining,
            resetTime: dailyUsage.resetTime,
          },
        },
        { status: 429 },
      );
    }

    // Check rate limiting
    const limitCheck = await consumeRateLimit(
      `crop:${clientIp}`,
      config.rateLimit.max,
      config.rateLimit.window,
    );
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Maximum ${config.rateLimit.max} requests per ${config.rateLimit.window / 1000 / 60} minutes`,
        },
        { status: 429 },
      );
    }

    const origin = request.headers.get('origin');
    if (origin && !SecurityValidator.isValidOrigin(origin)) {
      SecurityValidator.logSecurityEvent('cors_violation', { origin, clientIp }, 'warn');
      return NextResponse.json({ error: 'CORS policy violation' }, { status: 403 });
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const validation = ImageProcessor.validateImage(imageFile);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    let imageHash: string | undefined;
    let formatAwareCacheKey: string | undefined;

    if (config.performance.enableDedupCache) {
      const imageArrayBuffer = await imageFile.arrayBuffer();
      const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');
      imageHash = ImageProcessor.generateImageHash(imageBase64);

      // Create format-aware cache key: hash + original format
      const fileExtension = imageFile.name.split('.').pop()?.toLowerCase() || 'unknown';
      formatAwareCacheKey = `${imageHash}:${fileExtension}:${imageFile.type}`;

      const cachedResult = await getCachedResult(formatAwareCacheKey);
      if (cachedResult) {
        // Cache hit - don't consume daily usage, but include usage info in response
        const currentUsage = await checkDailyUsage(clientIp, false);
        SecurityValidator.logSecurityEvent('cache_hit', {
          imageHash,
          formatAwareCacheKey,
          clientIp
        }, 'info');
        return NextResponse.json({
          ...cachedResult,
          cached: true,
          processingTime: Date.now() - startTime,
          dailyUsage: {
            used: currentUsage.used,
            limit: currentUsage.limit,
            remaining: currentUsage.remaining,
            resetTime: currentUsage.resetTime,
            shouldWarn: currentUsage.shouldWarn,
          },
        });
      }
    }

    // Consume daily usage before making actual AI call
    const updatedDailyUsage = await checkDailyUsage(clientIp, true);
    if (!updatedDailyUsage.allowed) {
      return NextResponse.json(
        {
          error: 'Daily limit exceeded',
          message: `今天的${config.dailyLimit.maxRequests}次免费裁剪已用完，明天00:00重置`,
          messageEn: `Daily limit of ${config.dailyLimit.maxRequests} free crops exceeded. Resets at 00:00 tomorrow.`,
          dailyUsage: {
            used: updatedDailyUsage.used,
            limit: updatedDailyUsage.limit,
            remaining: updatedDailyUsage.remaining,
            resetTime: updatedDailyUsage.resetTime,
          },
        },
        { status: 429 },
      );
    }

    const cropServiceFormData = new FormData();
    cropServiceFormData.append('image', imageFile);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.cropService.timeout);

    try {
      const response = await fetch(`${config.cropService.url}/api/crop/aesthetic`, {
        method: 'POST',
        body: cropServiceFormData,
        signal: controller.signal,
        headers: {
          'X-Forwarded-For': clientIp,
          'X-Request-ID': crypto.randomUUID(),
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Crop service error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      const fileMetadata = ImageProcessor.extractImageMetadata(imageFile);
      const enhancedResult = {
        ...result,
        metadata: {
          ...(typeof result.metadata === 'object' && result.metadata !== null ? result.metadata : {}),
          file: fileMetadata,
        },
        imageHash,
        formatAwareCacheKey,
        originalFormat: {
          name: imageFile.name,
          type: imageFile.type,
          extension: imageFile.name.split('.').pop()?.toLowerCase() || 'unknown'
        },
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        cached: false,
        dailyUsage: {
          used: updatedDailyUsage.used,
          limit: updatedDailyUsage.limit,
          remaining: updatedDailyUsage.remaining,
          resetTime: updatedDailyUsage.resetTime,
          shouldWarn: updatedDailyUsage.shouldWarn,
        },
      };

      if (config.performance.enableDedupCache && formatAwareCacheKey) {
        await cacheResult(formatAwareCacheKey, enhancedResult);
        SecurityValidator.logSecurityEvent('cache_store', {
          imageHash,
          formatAwareCacheKey,
          clientIp
        }, 'info');
      }

      if (config.monitoring.enableLogging) {
        console.log(
          JSON.stringify({
            event: 'crop_request_success',
            clientIp,
            fileSize: imageFile.size,
            fileType: imageFile.type,
            processingTime: Date.now() - startTime,
            imageHash,
            timestamp: new Date().toISOString(),
          }),
        );
      }

      return NextResponse.json(enhancedResult);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw fetchError;
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;

    if (config.monitoring.enableLogging) {
      console.error(
        JSON.stringify({
          event: 'crop_request_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          processingTime,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return NextResponse.json(
          { error: 'Request timeout', message: 'AI服务响应超时，请稍后重试' },
          { status: 504 },
        );
      }
      if (error.message.includes('Rate limit')) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
    }

    return NextResponse.json(
      {
        error: 'AI裁剪服务暂时不可用',
        message: 'AI cropping service temporarily unavailable',
        processingTime,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'AI Crop API Proxy',
    version: '2.0.0',
    status: 'active',
    features: {
      rateLimit: `${config.rateLimit.max} requests per ${config.rateLimit.window / 1000 / 60} minutes`,
      imageValidation: true,
      deduplication: config.performance.enableDedupCache,
      monitoring: config.monitoring.enableLogging,
    },
    timestamp: new Date().toISOString(),
  });
}
