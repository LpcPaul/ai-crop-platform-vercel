import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { config } from "~/lib/config";

// 安全的文件名验证和清理
function sanitizeFilename(filename: string): string | null {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // 移除路径遍历尝试
  const cleaned = filename.replace(/[\/\\]/g, '');

  // 检查文件名格式 - 只允许字母数字、点、下划线、连字符
  const allowedPattern = /^[a-zA-Z0-9._-]+$/;
  if (!allowedPattern.test(cleaned)) {
    return null;
  }

  // 检查文件扩展名白名单
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
  const ext = path.extname(cleaned).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return null;
  }

  // 限制文件名长度
  if (cleaned.length > 100) {
    return null;
  }

  return cleaned;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // 验证和清理文件名
    const sanitizedFilename = sanitizeFilename(filename);
    if (!sanitizedFilename) {
      return NextResponse.json(
        { error: "无效的文件名" },
        { status: 400 }
      );
    }

    // 转发请求到crop-service
    const baseUrl = config.cropService.url.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/api/download/${encodeURIComponent(sanitizedFilename)}`);

    if (!response.ok) {
      throw new Error(`Download service error: ${response.status}`);
    }

    // 获取文件内容
    const blob = await response.blob();
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    // 安全的文件名编码用于Content-Disposition
    const encodedFilename = encodeURIComponent(sanitizedFilename);

    // 返回文件内容
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json(
      { error: "文件下载失败" },
      { status: 500 }
    );
  }
}
