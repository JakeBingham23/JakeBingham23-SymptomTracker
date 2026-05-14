#!/data/data/com.termux/files/usr/bin/bash
# ── Tracker deploy script ────────────────────────────────────────
# Usage: deploy.sh <zipfile> <commit message>
# Example: deploy.sh ~/storage/downloads/patch.zip "v5.9 fix"
#
# Extracts zip, copies everything into repo, commits, pushes.
# Always safe — git will only commit actual changes.

set -e

REPO="$HOME/JakeBingham23-SymptomTracker"
ZIP="$1"
MSG="${2:-update}"

if [ -z "$ZIP" ]; then
  echo "Usage: deploy.sh <zipfile> [commit message]"
  exit 1
fi

if [ ! -f "$ZIP" ]; then
  echo "File not found: $ZIP"
  exit 1
fi

echo "→ Extracting $ZIP"
TMPDIR=$(mktemp -d)
unzip -q -o "$ZIP" -d "$TMPDIR"

echo "→ Copying into repo"
# Handle both flat zips and zips with a leading folder
CONTENT=$(ls "$TMPDIR")
if [ "$(echo $CONTENT | wc -w)" = "1" ] && [ -d "$TMPDIR/$CONTENT" ]; then
  # Single top-level folder — copy its contents
  cp -r "$TMPDIR/$CONTENT/." "$REPO/"
else
  # Flat zip — copy directly
  cp -r "$TMPDIR/." "$REPO/"
fi

rm -rf "$TMPDIR"

echo "→ Committing"
cd "$REPO"
git add -A
git status --short

if git diff --cached --quiet; then
  echo "Nothing changed — already up to date."
  exit 0
fi

git commit -m "$MSG"
echo "→ Pushing"
git push
echo "✓ Done"
