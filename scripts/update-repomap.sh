#!/usr/bin/env bash
set -euo pipefail
mkdir -p architecture
# 首选：aider 的 repo map
if command -v aider >/dev/null 2>&1; then
  aider --show-repo-map > architecture/repomap.md
  exit 0
fi
# 兜底：ctags 符号清单（文件:行）
if command -v ctags >/dev/null 2>&1; then
  if ctags --help 2>&1 | grep -q -- '--recurse'; then
    ctags --recurse=yes --fields=+n --languages=Python,JavaScript,TypeScript,Go,Java -f - \
      | awk '{print $1 " @ " $2 ":" $3}' > architecture/repomap.md
    exit 0
  fi
fi
# 最后兜底：文件树
{
  echo "# Repo Map (fallback: file tree only)"
  echo
  echo '\`\`\`'
  if command -v tree >/dev/null 2>&1; then
    tree -a -I '.git|node_modules|.venv'
  else
    find . -path './.git' -prune -o -path './node_modules' -prune -o -print
  fi
  echo '\`\`\`'
  echo '⚠️ Neither aider nor recursive ctags found. Install universal-ctags for richer maps.'
} > architecture/repomap.md
