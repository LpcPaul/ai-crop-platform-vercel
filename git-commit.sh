#!/bin/bash

# 切换到项目目录
cd /Users/hujing/Desktop/code/ai-crop-platform

echo "=== Git Status ==="
git status

echo -e "\n=== Adding files ==="
# 添加UI优化相关文件
git add apps/nextjs/src/app/[lang]/(marketing)/client-page.tsx
git add apps/nextjs/src/config/dictionaries/zh.json
git add apps/nextjs/src/config/dictionaries/en.json
git add apps/nextjs/src/config/dictionaries/ja.json
git add apps/nextjs/src/config/dictionaries/ko.json
git add README.md

# 也添加之前修复的文件
git add apps/nextjs/src/app/page.tsx
git add .env.local
git add PROMPT_VERSION_MANAGEMENT.md
git add crop-service/server.js

echo -e "\n=== Committing changes ==="
git commit -m "$(cat <<'EOF'
feat: 优化AI裁剪平台UI和品牌形象

- 更新logo为剪刀图标，采用橙红渐变配色
- 优化顶部导航栏按钮样式和语言选择器
- 更新主标题为"AI裁剪，让每一张照片都会呼吸"
- 更新副标题为"3000万张图片训练的美学引擎"
- 删除与AI裁剪业务无关的功能卡片
- 完善四种语言的文案翻译
- 添加AI协作规范到README

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

echo -e "\n=== Checking remote ==="
git remote -v

echo -e "\n=== Setting remote if needed ==="
git remote set-url origin https://github.com/LpcPaul/ai-crop-service.git

echo -e "\n=== Pushing to GitHub ==="
git push origin main

echo -e "\n=== Done! ==="