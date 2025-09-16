#!/usr/bin/env bash
set -euo pipefail
HOOK=.git/hooks/pre-commit
mkdir -p .git/hooks
cat > "$HOOK" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
scripts/update-repomap.sh
git add architecture/repomap.md || true
HOOK
chmod +x "$HOOK"
