#!/usr/bin/env bash
# Manual push: ./push.sh ["commit message"]
# Stages all, commits (skips when clean), rebases on origin, pushes.
set -euo pipefail
cd "$(dirname "$0")"

MSG="${1:-Update $(date '+%Y-%m-%d %H:%M')}"
BRANCH="$(git branch --show-current)"

if [ -z "$BRANCH" ]; then
  echo "Not on a branch. Aborting." >&2
  exit 1
fi

git add -A

if git diff --cached --quiet; then
  echo "Nothing to push."
else
  if git diff --cached -- .env.example | grep -Eq 'gsk_|AQ\.Ab8'; then
    echo "Blocked: .env.example contains a real API key. Replace with placeholders." >&2
    exit 1
  fi
  git commit -m "$MSG"
fi

git pull --rebase origin "$BRANCH"
git push origin "$BRANCH"
