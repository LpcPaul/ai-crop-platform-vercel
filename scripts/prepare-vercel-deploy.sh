#!/bin/bash

# Vercel部署前准备脚本
echo "🚀 准备Vercel部署..."

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 备份原始package.json
cp apps/nextjs/package.json apps/nextjs/package.json.backup

# 使用Vercel专用的package.json
cp apps/nextjs/package.vercel.json apps/nextjs/package.json

echo "✅ Vercel部署准备完成"
echo "📝 已将package.json替换为Vercel优化版本"
echo "💾 原始package.json已备份为package.json.backup"