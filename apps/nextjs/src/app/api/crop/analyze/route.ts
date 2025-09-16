import { NextRequest, NextResponse } from 'next/server';
import imageSize from 'image-size';
import crypto from 'crypto';

import { config } from '~/lib/config';
import { ImageProcessor } from '~/lib/utils/image';
import { getCachedResult, cacheResult } from '~/lib/utils/cache';
import { SecurityValidator } from '~/lib/utils/security';
import { consumeRateLimit } from '~/lib/utils/rate-limit';

// Types according to API Contract v1
interface CropSolution {
  version: "1";
  reason: string;
  details: string;
  crop_params: {
    original_size: [number, number];
    crop_box: { x: number; y: number; width: number; height: number };
    output_size: [number, number];
    crop_ratio: string;
  };
  metadata: {
    scene: string;
    model: string;
    prompt_version: string;
    source: "model" | "cache" | "fallback";
    request_id: string;
  };
}

interface ErrorResponse {
  error: {
    code: 'RATE_LIMIT' | 'QUOTA_EXCEEDED' | 'BAD_IMAGE_FORMAT' | 'AI_TIMEOUT' | 'AI_PARSE_ERROR' | 'INTERNAL' | 'UNAUTHORIZED' | 'NOT_FOUND';
    message: string;
    details?: string;
  };
  request_id: string;
}

function generateFallbackSolution(
  originalWidth: number,
  originalHeight: number,
  targetRatio: string,
  requestId: string
): CropSolution {
  // Calculate crop box based on short edge, center crop
  const [ratioW, ratioH] = targetRatio.split(':').map(Number);
  const targetAspectRatio = ratioW / ratioH;
  const originalAspectRatio = originalWidth / originalHeight;

  let cropWidth: number, cropHeight: number, cropX: number, cropY: number;

  if (originalAspectRatio > targetAspectRatio) {
    // Original is wider, crop width
    cropHeight = originalHeight;
    cropWidth = Math.floor(cropHeight * targetAspectRatio);
    cropX = Math.floor((originalWidth - cropWidth) / 2);
    cropY = 0;
  } else {
    // Original is taller, crop height
    cropWidth = originalWidth;
    cropHeight = Math.floor(cropWidth / targetAspectRatio);
    cropX = 0;
    cropY = Math.floor((originalHeight - cropHeight) / 2);
  }

  // Output size should not exceed crop box (no upscaling)
  const outputWidth = Math.min(cropWidth, 1920);
  const outputHeight = Math.floor(outputWidth / targetAspectRatio);

  return {
    version: "1",
    reason: "系统自动分析：基于图片比例进行居中裁剪",
    details: "当AI服务不可用时，采用基于短边的等比居中裁剪策略确保内容完整性",
    crop_params: {
      original_size: [originalWidth, originalHeight],
      crop_box: { x: cropX, y: cropY, width: cropWidth, height: cropHeight },
      output_size: [outputWidth, outputHeight],
      crop_ratio: targetRatio,
    },
    metadata: {
      scene: "instagram-post", // Default scene
      model: "fallback",
      prompt_version: "v1.0",
      source: "fallback",
      request_id: requestId,
    },
  };
}

function generateCacheKey(imageBuffer: Buffer, scene: string, ratio: string): string {
  const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
  return `${imageHash}:${scene}:${ratio}:${config.openai.model}:v1.0`;
}

async function callOpenAI(imageBase64: string, scene: string = "instagram-post"): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(`${config.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.openai.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `请分析这张图片，为${scene === 'instagram-post' ? 'Instagram帖子' : '社交媒体'}提供最佳的裁剪建议。请返回JSON格式：
{
  "reason": "情感化理由说明",
  "details": "技术分析详情",
  "crop_params": {
    "x": 裁剪起始X坐标,
    "y": 裁剪起始Y坐标,
    "width": 裁剪宽度,
    "height": 裁剪高度
  }
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    return result.choices[0]?.message?.content;

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function parseAIResponse(aiContent: string, originalWidth: number, originalHeight: number): any {
  try {
    // Try to extract JSON from AI response
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.reason || !parsed.details || !parsed.crop_params) {
      throw new Error('Missing required fields in AI response');
    }

    const { x, y, width, height } = parsed.crop_params;

    // Validate crop params are within bounds
    if (x < 0 || y < 0 || x + width > originalWidth || y + height > originalHeight) {
      throw new Error('Crop parameters out of bounds');
    }

    if (width < 100 || height < 100) {
      throw new Error('Crop dimensions too small');
    }

    return parsed;
  } catch (error) {
    throw new Error(`AI response parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Set API version header
    const headers = new Headers();
    headers.set('X-Crop-API-Version', '1');
    headers.set('X-Prompt-Version', 'v1.0');

    // Get client IP for rate limiting
    const clientIp = request.ip ||
                    request.headers.get('x-forwarded-for')?.split(',')[0] ||
                    request.headers.get('x-real-ip') ||
                    'unknown';

    const limitCheck = await consumeRateLimit(
      `crop:analyze:${clientIp}`,
      config.rateLimit.max,
      config.rateLimit.window,
    );

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT',
            message: `Rate limit exceeded. Maximum ${config.rateLimit.max} requests per ${config.rateLimit.window / 1000 / 60} minutes`,
          },
          request_id: requestId,
        } as ErrorResponse,
        { status: 429, headers }
      );
    }

    // Parse request
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const scene = (formData.get('scene') as string) || 'instagram-post';
    const ratio = (formData.get('ratio') as string) || '1:1';

    if (!imageFile) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_IMAGE_FORMAT',
            message: 'No image file provided',
          },
          request_id: requestId,
        } as ErrorResponse,
        { status: 400, headers }
      );
    }

    // Validate image
    const validation = ImageProcessor.validateImage(imageFile);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_IMAGE_FORMAT',
            message: validation.error || 'Invalid image format',
          },
          request_id: requestId,
        } as ErrorResponse,
        { status: 400, headers }
      );
    }

    // Get image buffer and metadata
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const imageBase64 = imageBuffer.toString('base64');

    const { width: originalWidth, height: originalHeight } = imageSize(imageBuffer);
    if (!originalWidth || !originalHeight) {
      SecurityValidator.logSecurityEvent(
        'image_dimension_unavailable',
        { clientIp, requestId, fileType: imageFile.type },
        'error',
      );
      return NextResponse.json(
        {
          error: {
            code: 'BAD_IMAGE_FORMAT',
            message: 'Unable to determine image dimensions',
          },
          request_id: requestId,
        } as ErrorResponse,
        { status: 400, headers },
      );
    }

    // Generate cache key
    const cacheKey = generateCacheKey(imageBuffer, scene, ratio);

    // Check cache first
    if (config.performance.enableDedupCache) {
      const cachedResult = await getCachedResult(cacheKey);
      if (cachedResult) {
        // Log cache hit
        SecurityValidator.logSecurityEvent('cache_hit', { cacheKey, clientIp, requestId }, 'info');

        return NextResponse.json({
          ...cachedResult,
          metadata: {
            ...cachedResult.metadata,
            source: "cache",
            request_id: requestId,
          }
        } as CropSolution, { headers });
      }
    }

    let solution: CropSolution;

    try {
      // Try AI analysis first
      const aiResponse = await callOpenAI(imageBase64, scene);
      const parsed = parseAIResponse(aiResponse, originalWidth, originalHeight);

      // Convert to standard solution format
      const [ratioW, ratioH] = ratio.split(':').map(Number);
      const cropAspectRatio = ratioW / ratioH;
      const { x, y, width, height } = parsed.crop_params;

      // Calculate output size (no upscaling)
      const maxOutputWidth = Math.min(width, 1920);
      const outputWidth = Math.min(maxOutputWidth, width);
      const outputHeight = Math.floor(outputWidth / cropAspectRatio);

      solution = {
        version: "1",
        reason: parsed.reason,
        details: parsed.details,
        crop_params: {
          original_size: [originalWidth, originalHeight],
          crop_box: { x, y, width, height },
          output_size: [outputWidth, outputHeight],
          crop_ratio: ratio,
        },
        metadata: {
          scene,
          model: config.openai.model,
          prompt_version: "v1.0",
          source: "model",
          request_id: requestId,
        },
      };

      // Cache the result
      if (config.performance.enableDedupCache) {
        await cacheResult(cacheKey, solution);
      }

    } catch (aiError) {
      // AI failed, use fallback
      console.warn('AI analysis failed, using fallback:', aiError);
      solution = generateFallbackSolution(originalWidth, originalHeight, ratio, requestId);
    }

    // Structured logging
    if (config.monitoring.enableLogging) {
      console.log(JSON.stringify({
        event: 'crop_analyze_success',
        request_id: requestId,
        client_ip: clientIp,
        scene,
        ratio,
        source: solution.metadata.source,
        processing_time: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }));
    }

    return NextResponse.json(solution, { headers });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Structured error logging
    if (config.monitoring.enableLogging) {
      console.error(JSON.stringify({
        event: 'crop_analyze_error',
        request_id: requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        processing_time: processingTime,
        timestamp: new Date().toISOString(),
      }));
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL',
          message: 'Internal server error',
          details: 'An unexpected error occurred during image analysis',
        },
        request_id: requestId,
      } as ErrorResponse,
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const headers = new Headers();
  headers.set('X-Crop-API-Version', '1');

  return NextResponse.json({
    service: 'AI Crop Analyze API',
    version: '1.0.0',
    status: 'active',
    contract: 'v1',
    timestamp: new Date().toISOString(),
  }, { headers });
}
