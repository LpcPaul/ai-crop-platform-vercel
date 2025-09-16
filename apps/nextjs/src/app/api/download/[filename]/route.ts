import { NextRequest, NextResponse } from "next/server";

import { config } from "~/lib/config";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // 转发请求到crop-service
    const baseUrl = config.cropService.url.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/api/download/${filename}`);

    if (!response.ok) {
      throw new Error(`Download service error: ${response.status}`);
    }

    // 获取文件内容
    const blob = await response.blob();
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    // 返回文件内容
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
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
