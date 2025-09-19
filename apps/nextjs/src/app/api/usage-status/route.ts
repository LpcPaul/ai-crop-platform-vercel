import { NextRequest, NextResponse } from 'next/server';

import { getDailyUsageStatus } from '~/lib/utils/daily-usage-limiter';
import { config } from '~/lib/config';

export async function GET(request: NextRequest) {
  try {
    const clientIp =
      request.ip ||
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const usageStatus = await getDailyUsageStatus(clientIp);

    return NextResponse.json({
      status: 'success',
      data: {
        used: usageStatus.used,
        limit: usageStatus.limit,
        remaining: usageStatus.remaining,
        resetTime: usageStatus.resetTime,
        shouldWarn: usageStatus.shouldWarn,
        allowed: usageStatus.allowed,
        warningThreshold: config.dailyLimit.warningThreshold,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Usage status API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get usage status',
        message: '获取使用状态失败',
      },
      { status: 500 },
    );
  }
}