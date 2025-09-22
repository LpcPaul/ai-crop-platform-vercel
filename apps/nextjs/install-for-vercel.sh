#!/bin/bash

# Vercel专用安装脚本
# 解决monorepo依赖问题

echo "🚀 开始Vercel monorepo安装..."

# 确保在正确的目录
cd /vercel/path0/apps/nextjs || exit 1

echo "📦 安装根依赖..."
# 先在根目录安装所有依赖
cd ../../
npm install --legacy-peer-deps

echo "🔧 链接本地包..."
# 回到nextjs目录
cd apps/nextjs

# 手动创建符号链接到本地包
mkdir -p node_modules/@saasfly

# 创建符号链接
ln -sf ../../../packages/api node_modules/@saasfly/api
ln -sf ../../../packages/auth node_modules/@saasfly/auth
ln -sf ../../../packages/db node_modules/@saasfly/db
ln -sf ../../../packages/stripe node_modules/@saasfly/stripe

# 链接配置包
ln -sf ../../../tooling/eslint-config node_modules/@saasfly/eslint-config
ln -sf ../../../tooling/prettier-config node_modules/@saasfly/prettier-config
ln -sf ../../../tooling/tailwind-config node_modules/@saasfly/tailwind-config
ln -sf ../../../tooling/typescript-config node_modules/@saasfly/typescript-config

echo "✅ Vercel monorepo安装完成"